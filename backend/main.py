from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any
from datetime import datetime
import json
from pathlib import Path


app = FastAPI(title="Elce API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

LESSONS_FILE = DATA_DIR / "lessons.json"
SCENARIOS_FILE = DATA_DIR / "scenarios.json"
PROGRESS_FILE = DATA_DIR / "user_progress.json"
UNITS_FILE = DATA_DIR / "units.json"
GESTURE_SAMPLES_FILE = DATA_DIR / "gesture_samples.json"
GESTURE_SEQUENCES_FILE = DATA_DIR / "gesture_sequences.json"
NORMALIZED_SEQUENCES_FILE = DATA_DIR / "normalized_sequences.json"


TARGET_FRAME_COUNT = 60
MAX_HANDS = 2
HAND_LANDMARK_COUNT = 21
MOUTH_LANDMARK_COUNT = 40
TARGET_SAMPLES_PER_VARIANT = 5

BLENDSHAPE_NAMES = [
    "jawOpen",
    "mouthClose",
    "mouthFunnel",
    "mouthPucker",
    "mouthLeft",
    "mouthRight",
    "mouthSmileLeft",
    "mouthSmileRight",
    "mouthFrownLeft",
    "mouthFrownRight",
]


class GestureSample(BaseModel):
    label: str
    variantLabel: str | None = None
    lessonId: int
    expectedHands: int
    detectedHands: int
    hands: list[dict[str, Any]]


class GestureSequence(BaseModel):
    label: str
    variantLabel: str | None = None
    lessonId: int
    expectedHands: int
    durationMs: int
    frameCount: int
    frames: list[dict[str, Any]]


def read_json(file_path: Path):
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path.name}")

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_json(file_path: Path, data):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def ensure_json_file(file_path: Path, default_data):
    if not file_path.exists():
        write_json(file_path, default_data)


def normalize_progress(progress):
    progress.setdefault("xp", 0)
    progress.setdefault("streak", 0)
    progress.setdefault("completedLessons", [])
    progress.setdefault("completedScenarios", [])
    progress.setdefault("completedUnitLessons", [])
    progress.setdefault("speedTestsCompleted", 0)
    progress.setdefault("cameraPracticesCompleted", 0)
    progress.setdefault("badges", [])
    return progress


def find_item_by_id(items, item_id):
    for item in items:
        if item["id"] == item_id:
            return item

    return None


def find_lesson_in_units(units, lesson_id):
    for unit in units:
        for lesson in unit["lessons"]:
            if lesson["id"] == lesson_id:
                return lesson

    return None


def safe_float(value):
    if value is None:
        return 0.0

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def point_to_vector(point):
    return [
        safe_float(point.get("x")),
        safe_float(point.get("y")),
        safe_float(point.get("z")),
    ]


def normalize_hand_landmarks(hand):
    landmarks = hand.get("landmarks", [])

    vector = []

    for index in range(HAND_LANDMARK_COUNT):
        if index < len(landmarks):
            vector.extend(point_to_vector(landmarks[index]))
        else:
            vector.extend([0.0, 0.0, 0.0])

    return vector


def normalize_hands(frame):
    hands = frame.get("hands", [])

    vector = []

    for hand_index in range(MAX_HANDS):
        if hand_index < len(hands):
            vector.extend(normalize_hand_landmarks(hands[hand_index]))
        else:
            vector.extend([0.0] * HAND_LANDMARK_COUNT * 3)

    return vector


def normalize_mouth_landmarks(frame):
    face = frame.get("face") or {}
    mouth_landmarks = face.get("mouthLandmarks", [])

    vector = []

    for index in range(MOUTH_LANDMARK_COUNT):
        if index < len(mouth_landmarks):
            vector.extend(point_to_vector(mouth_landmarks[index]))
        else:
            vector.extend([0.0, 0.0, 0.0])

    return vector


def normalize_blendshapes(frame):
    face = frame.get("face") or {}
    blendshapes = face.get("blendshapes", [])

    score_map = {}

    for item in blendshapes:
        name = item.get("name")
        score = safe_float(item.get("score"))

        if name:
            score_map[name] = score

    return [score_map.get(name, 0.0) for name in BLENDSHAPE_NAMES]


def normalize_single_frame(frame):
    hand_vector = normalize_hands(frame)
    mouth_vector = normalize_mouth_landmarks(frame)
    blendshape_vector = normalize_blendshapes(frame)

    return {
        "timestampMs": int(frame.get("timestampMs", 0)),
        "handCount": int(frame.get("handCount", 0)),
        "faceDetected": bool((frame.get("face") or {}).get("detected", False)),
        "features": hand_vector + mouth_vector + blendshape_vector,
    }


def resample_frames(frames, target_count=TARGET_FRAME_COUNT):
    if not frames:
        empty_frame = {
            "timestampMs": 0,
            "handCount": 0,
            "hands": [],
            "face": {
                "detected": False,
                "landmarkCount": 0,
                "mouthLandmarks": [],
                "blendshapes": [],
            },
        }

        return [empty_frame for _ in range(target_count)]

    if len(frames) == target_count:
        return frames

    if len(frames) == 1:
        return [frames[0] for _ in range(target_count)]

    sampled = []

    for target_index in range(target_count):
        source_index = round(target_index * (len(frames) - 1) / (target_count - 1))
        sampled.append(frames[source_index])

    return sampled


def get_variant_label(sequence):
    label = sequence.get("label") or "unknown"
    variant_label = sequence.get("variantLabel")

    if variant_label:
        return variant_label

    return f"{label}_v1"


def normalize_sequence(sequence):
    raw_frames = sequence.get("frames", [])
    sampled_frames = resample_frames(raw_frames, TARGET_FRAME_COUNT)
    normalized_frames = [normalize_single_frame(frame) for frame in sampled_frames]

    feature_length = 0

    if normalized_frames:
        feature_length = len(normalized_frames[0]["features"])

    return {
        "id": sequence.get("id"),
        "label": sequence.get("label"),
        "variantLabel": get_variant_label(sequence),
        "lessonId": sequence.get("lessonId"),
        "expectedHands": sequence.get("expectedHands"),
        "sourceFrameCount": sequence.get("frameCount", len(raw_frames)),
        "targetFrameCount": TARGET_FRAME_COUNT,
        "featureLength": feature_length,
        "featureSchema": {
            "maxHands": MAX_HANDS,
            "handLandmarksPerHand": HAND_LANDMARK_COUNT,
            "mouthLandmarkCount": MOUTH_LANDMARK_COUNT,
            "blendshapeNames": BLENDSHAPE_NAMES,
        },
        "frames": normalized_frames,
        "createdAt": datetime.now().isoformat(),
    }


def get_camera_gestures_from_units():
    ensure_json_file(UNITS_FILE, [])

    units = read_json(UNITS_FILE)
    gestures = {}

    for unit in units:
        for lesson in unit.get("lessons", []):
            for exercise in lesson.get("exercises", []):
                if exercise.get("type") != "camera":
                    continue

                label = exercise.get("expectedGesture")

                if not label:
                    continue

                accepted_variants = exercise.get("acceptedVariants", [])

                if not accepted_variants:
                    accepted_variants = [
                        {
                            "id": f"{label}_v1",
                            "title": f"{label} - Varyant 1",
                        }
                    ]

                if label not in gestures:
                    gestures[label] = {
                        "label": label,
                        "lessonIds": [],
                        "titles": [],
                        "expectedHands": exercise.get("expectedHands", 1),
                        "variants": [],
                    }

                if lesson.get("id") not in gestures[label]["lessonIds"]:
                    gestures[label]["lessonIds"].append(lesson.get("id"))

                if lesson.get("title") not in gestures[label]["titles"]:
                    gestures[label]["titles"].append(lesson.get("title"))

                existing_variant_ids = {
                    variant["id"] for variant in gestures[label]["variants"]
                }

                for variant in accepted_variants:
                    variant_id = variant.get("id")

                    if not variant_id:
                        continue

                    if variant_id not in existing_variant_ids:
                        gestures[label]["variants"].append({
                            "id": variant_id,
                            "title": variant.get("title", variant_id),
                            "label": label,
                            "lessonId": lesson.get("id"),
                            "expectedHands": exercise.get("expectedHands", 1),
                        })
                        existing_variant_ids.add(variant_id)

    return gestures


def count_by_label(items):
    counts = {}

    for item in items:
        label = item.get("label")

        if not label:
            continue

        counts[label] = counts.get(label, 0) + 1

    return counts


def count_by_variant(items):
    counts = {}

    for item in items:
        variant_label = get_variant_label(item)

        if not variant_label:
            continue

        counts[variant_label] = counts.get(variant_label, 0) + 1

    return counts


def build_dataset_summary():
    ensure_json_file(GESTURE_SEQUENCES_FILE, [])
    ensure_json_file(NORMALIZED_SEQUENCES_FILE, [])

    gestures = get_camera_gestures_from_units()
    raw_sequences = read_json(GESTURE_SEQUENCES_FILE)
    normalized_sequences = read_json(NORMALIZED_SEQUENCES_FILE)

    raw_counts_by_label = count_by_label(raw_sequences)
    normalized_counts_by_label = count_by_label(normalized_sequences)

    raw_counts_by_variant = count_by_variant(raw_sequences)
    normalized_counts_by_variant = count_by_variant(normalized_sequences)

    items = []

    for label in sorted(gestures.keys()):
        gesture_info = gestures[label]

        variants = []

        for variant in gesture_info["variants"]:
            variant_id = variant["id"]
            raw_count = raw_counts_by_variant.get(variant_id, 0)
            normalized_count = normalized_counts_by_variant.get(variant_id, 0)
            remaining = max(TARGET_SAMPLES_PER_VARIANT - raw_count, 0)

            variants.append({
                "id": variant_id,
                "title": variant["title"],
                "rawCount": raw_count,
                "normalizedCount": normalized_count,
                "target": TARGET_SAMPLES_PER_VARIANT,
                "remaining": remaining,
                "isReady": raw_count >= TARGET_SAMPLES_PER_VARIANT,
            })

        raw_count_total = raw_counts_by_label.get(label, 0)
        normalized_count_total = normalized_counts_by_label.get(label, 0)
        variant_target_total = TARGET_SAMPLES_PER_VARIANT * max(len(variants), 1)
        remaining_total = max(variant_target_total - raw_count_total, 0)

        items.append({
            "label": label,
            "titles": gesture_info["titles"],
            "lessonIds": gesture_info["lessonIds"],
            "expectedHands": gesture_info["expectedHands"],
            "rawCount": raw_count_total,
            "normalizedCount": normalized_count_total,
            "target": variant_target_total,
            "remaining": remaining_total,
            "isReady": raw_count_total >= variant_target_total,
            "variants": variants,
        })

    ready_count = sum(1 for item in items if item["isReady"])
    variant_count = sum(len(item["variants"]) for item in items)
    ready_variant_count = sum(
        1
        for item in items
        for variant in item["variants"]
        if variant["isReady"]
    )

    return {
        "targetPerVariant": TARGET_SAMPLES_PER_VARIANT,
        "totalGestures": len(items),
        "readyGestures": ready_count,
        "totalVariants": variant_count,
        "readyVariants": ready_variant_count,
        "totalSequences": len(raw_sequences),
        "totalNormalizedSequences": len(normalized_sequences),
        "items": items,
    }


@app.get("/")
def home():
    return {
        "message": "Elce API calisiyor",
        "status": "ok"
    }


@app.get("/lessons")
def get_lessons():
    return read_json(LESSONS_FILE)


@app.get("/scenarios")
def get_scenarios():
    return read_json(SCENARIOS_FILE)


@app.get("/progress")
def get_progress():
    progress = normalize_progress(read_json(PROGRESS_FILE))
    write_json(PROGRESS_FILE, progress)
    return progress


@app.get("/units")
def get_units():
    return read_json(UNITS_FILE)


@app.get("/units/{unit_id}")
def get_unit(unit_id: int):
    units = read_json(UNITS_FILE)
    selected_unit = find_item_by_id(units, unit_id)

    if selected_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")

    return selected_unit


@app.get("/lesson-flow/{lesson_id}")
def get_lesson_flow(lesson_id: int):
    units = read_json(UNITS_FILE)
    selected_lesson = find_lesson_in_units(units, lesson_id)

    if selected_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson flow not found")

    return selected_lesson


@app.post("/complete-lesson-flow/{lesson_id}")
def complete_lesson_flow(lesson_id: int):
    units = read_json(UNITS_FILE)
    progress = normalize_progress(read_json(PROGRESS_FILE))

    selected_lesson = find_lesson_in_units(units, lesson_id)

    if selected_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson flow not found")

    if lesson_id not in progress["completedUnitLessons"]:
        progress["completedUnitLessons"].append(lesson_id)
        progress["xp"] += selected_lesson.get("xp", 0)

        if "ilk_unite_dersi" not in progress["badges"]:
            progress["badges"].append("ilk_unite_dersi")

    write_json(PROGRESS_FILE, progress)

    return {
        "message": "Lesson flow completed",
        "lesson": selected_lesson,
        "progress": progress
    }


@app.post("/complete-lesson/{lesson_id}")
def complete_lesson(lesson_id: int):
    lessons = read_json(LESSONS_FILE)
    progress = normalize_progress(read_json(PROGRESS_FILE))

    selected_lesson = find_item_by_id(lessons, lesson_id)

    if selected_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if lesson_id not in progress["completedLessons"]:
        progress["completedLessons"].append(lesson_id)
        progress["xp"] += selected_lesson.get("xp", 0)

        if "ilk_ders" not in progress["badges"]:
            progress["badges"].append("ilk_ders")

    write_json(PROGRESS_FILE, progress)

    return {
        "message": "Lesson completed",
        "lesson": selected_lesson,
        "progress": progress
    }


@app.post("/complete-scenario/{scenario_id}")
def complete_scenario(scenario_id: int):
    scenarios = read_json(SCENARIOS_FILE)
    progress = normalize_progress(read_json(PROGRESS_FILE))

    selected_scenario = find_item_by_id(scenarios, scenario_id)

    if selected_scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    if scenario_id not in progress["completedScenarios"]:
        progress["completedScenarios"].append(scenario_id)
        progress["xp"] += selected_scenario.get("xp", 0)

        if selected_scenario["title"] == "Acil Durum":
            if "acil_durum_hazir" not in progress["badges"]:
                progress["badges"].append("acil_durum_hazir")

    write_json(PROGRESS_FILE, progress)

    return {
        "message": "Scenario completed",
        "scenario": selected_scenario,
        "progress": progress
    }


@app.post("/complete-speed-test/{lesson_id}")
def complete_speed_test(lesson_id: int):
    lessons = read_json(LESSONS_FILE)
    progress = normalize_progress(read_json(PROGRESS_FILE))

    selected_lesson = find_item_by_id(lessons, lesson_id)

    if selected_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress["speedTestsCompleted"] += 1
    progress["xp"] += 10

    if "hiz_testi" not in progress["badges"]:
        progress["badges"].append("hiz_testi")

    write_json(PROGRESS_FILE, progress)

    return {
        "message": "Speed test completed",
        "lesson": selected_lesson,
        "earnedXp": 10,
        "progress": progress
    }


@app.get("/gesture-samples")
def get_gesture_samples():
    ensure_json_file(GESTURE_SAMPLES_FILE, [])

    samples = read_json(GESTURE_SAMPLES_FILE)

    return {
        "count": len(samples),
        "samples": samples
    }


@app.post("/gesture-samples")
def create_gesture_sample(sample: GestureSample):
    ensure_json_file(GESTURE_SAMPLES_FILE, [])

    samples = read_json(GESTURE_SAMPLES_FILE)

    variant_label = sample.variantLabel or f"{sample.label}_v1"

    new_sample = {
        "id": len(samples) + 1,
        "label": sample.label,
        "variantLabel": variant_label,
        "lessonId": sample.lessonId,
        "expectedHands": sample.expectedHands,
        "detectedHands": sample.detectedHands,
        "hands": sample.hands,
        "createdAt": datetime.now().isoformat()
    }

    samples.append(new_sample)
    write_json(GESTURE_SAMPLES_FILE, samples)

    return {
        "message": "Gesture sample saved",
        "sample": new_sample,
        "count": len(samples)
    }


@app.get("/gesture-sequences")
def get_gesture_sequences():
    ensure_json_file(GESTURE_SEQUENCES_FILE, [])

    sequences = read_json(GESTURE_SEQUENCES_FILE)

    return {
        "count": len(sequences),
        "sequences": sequences
    }


@app.post("/gesture-sequences")
def create_gesture_sequence(sequence: GestureSequence):
    ensure_json_file(GESTURE_SEQUENCES_FILE, [])

    sequences = read_json(GESTURE_SEQUENCES_FILE)

    variant_label = sequence.variantLabel or f"{sequence.label}_v1"

    new_sequence = {
        "id": len(sequences) + 1,
        "label": sequence.label,
        "variantLabel": variant_label,
        "lessonId": sequence.lessonId,
        "expectedHands": sequence.expectedHands,
        "durationMs": sequence.durationMs,
        "frameCount": sequence.frameCount,
        "frames": sequence.frames,
        "createdAt": datetime.now().isoformat()
    }

    sequences.append(new_sequence)
    write_json(GESTURE_SEQUENCES_FILE, sequences)

    return {
        "message": "Gesture sequence saved",
        "sequence": new_sequence,
        "count": len(sequences)
    }


@app.get("/normalized-sequences")
def get_normalized_sequences():
    ensure_json_file(NORMALIZED_SEQUENCES_FILE, [])

    normalized_sequences = read_json(NORMALIZED_SEQUENCES_FILE)

    return {
        "count": len(normalized_sequences),
        "targetFrameCount": TARGET_FRAME_COUNT,
        "sequences": normalized_sequences,
    }


@app.post("/normalize-sequences")
def normalize_sequences():
    ensure_json_file(GESTURE_SEQUENCES_FILE, [])
    ensure_json_file(NORMALIZED_SEQUENCES_FILE, [])

    raw_sequences = read_json(GESTURE_SEQUENCES_FILE)

    normalized_sequences = [
        normalize_sequence(sequence)
        for sequence in raw_sequences
    ]

    write_json(NORMALIZED_SEQUENCES_FILE, normalized_sequences)

    return {
        "message": "Sequences normalized",
        "sourceCount": len(raw_sequences),
        "normalizedCount": len(normalized_sequences),
        "targetFrameCount": TARGET_FRAME_COUNT,
    }


@app.get("/dataset-summary")
def get_dataset_summary():
    return build_dataset_summary()