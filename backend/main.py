from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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


def read_json(file_path: Path):
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path.name}")

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_json(file_path: Path, data):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


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
    return read_json(PROGRESS_FILE)


@app.post("/complete-lesson/{lesson_id}")
def complete_lesson(lesson_id: int):
    lessons = read_json(LESSONS_FILE)
    progress = read_json(PROGRESS_FILE)

    selected_lesson = None

    for lesson in lessons:
        if lesson["id"] == lesson_id:
            selected_lesson = lesson
            break

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
    progress = read_json(PROGRESS_FILE)

    selected_scenario = None

    for scenario in scenarios:
        if scenario["id"] == scenario_id:
            selected_scenario = scenario
            break

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