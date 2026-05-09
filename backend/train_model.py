import json
from pathlib import Path
from collections import Counter

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

NORMALIZED_SEQUENCES_FILE = DATA_DIR / "normalized_sequences.json"

MODEL_FILE = MODELS_DIR / "gesture_model.pkl"
LABEL_MAP_FILE = MODELS_DIR / "label_map.json"
TRAINING_REPORT_FILE = MODELS_DIR / "training_report.json"

RANDOM_STATE = 42
TEST_SIZE = 0.25


def read_json(file_path):
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def write_json(file_path, data):
    with open(file_path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def flatten_sequence(sequence):
    frames = sequence.get("frames", [])

    if not frames:
        raise ValueError(f"Sequence {sequence.get('id')} has no frames")

    flat_features = []

    for frame in frames:
        features = frame.get("features", [])

        if not features:
            raise ValueError(
                f"Sequence {sequence.get('id')} has a frame without features"
            )

        flat_features.extend(features)

    return flat_features


def get_sequence_label(sequence):
    variant_label = sequence.get("variantLabel")

    if variant_label:
        return variant_label

    label = sequence.get("label")

    if label:
        return f"{label}_v1"

    return "unknown"


def build_dataset(sequences):
    x_data = []
    y_data = []
    metadata = []

    expected_feature_length = None
    expected_frame_count = None

    for sequence in sequences:
        sequence_id = sequence.get("id")
        label = get_sequence_label(sequence)
        frames = sequence.get("frames", [])

        if not frames:
            print(f"Skipping sequence {sequence_id}: no frames")
            continue

        feature_length = sequence.get("featureLength")
        target_frame_count = sequence.get("targetFrameCount")

        if expected_feature_length is None:
            expected_feature_length = feature_length

        if expected_frame_count is None:
            expected_frame_count = target_frame_count

        if feature_length != expected_feature_length:
            print(
                f"Skipping sequence {sequence_id}: featureLength mismatch "
                f"{feature_length} != {expected_feature_length}"
            )
            continue

        if target_frame_count != expected_frame_count:
            print(
                f"Skipping sequence {sequence_id}: targetFrameCount mismatch "
                f"{target_frame_count} != {expected_frame_count}"
            )
            continue

        flat_features = flatten_sequence(sequence)

        x_data.append(flat_features)
        y_data.append(label)
        metadata.append({
            "id": sequence_id,
            "label": sequence.get("label"),
            "variantLabel": label,
            "lessonId": sequence.get("lessonId"),
            "sourceFrameCount": sequence.get("sourceFrameCount"),
            "targetFrameCount": target_frame_count,
            "featureLength": feature_length,
            "flatFeatureLength": len(flat_features),
        })

    if not x_data:
        raise ValueError("No usable sequences found")

    x_array = np.array(x_data, dtype=np.float32)
    y_array = np.array(y_data)

    return x_array, y_array, metadata


def make_label_maps(labels):
    unique_labels = sorted(set(labels))

    label_to_index = {
        label: index
        for index, label in enumerate(unique_labels)
    }

    index_to_label = {
        str(index): label
        for label, index in label_to_index.items()
    }

    return unique_labels, label_to_index, index_to_label


def can_stratify(labels):
    counts = Counter(labels)

    if len(counts) < 2:
        return False

    return all(count >= 2 for count in counts.values())


def train_model(x_data, y_data):
    stratify_labels = y_data if can_stratify(y_data) else None

    if len(y_data) < 4:
        raise ValueError("Dataset is too small to train. Need at least 4 sequences.")

    x_train, x_test, y_train, y_test = train_test_split(
        x_data,
        y_data,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=stratify_labels,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=RANDOM_STATE,
        class_weight="balanced",
        max_depth=None,
    )

    model.fit(x_train, y_train)

    train_predictions = model.predict(x_train)
    test_predictions = model.predict(x_test)

    train_accuracy = accuracy_score(y_train, train_predictions)
    test_accuracy = accuracy_score(y_test, test_predictions)

    return {
        "model": model,
        "x_train": x_train,
        "x_test": x_test,
        "y_train": y_train,
        "y_test": y_test,
        "train_predictions": train_predictions,
        "test_predictions": test_predictions,
        "train_accuracy": train_accuracy,
        "test_accuracy": test_accuracy,
    }


def build_report(sequences, x_data, y_data, metadata, train_result, labels):
    label_counts = Counter(y_data)

    test_report = classification_report(
        train_result["y_test"],
        train_result["test_predictions"],
        labels=labels,
        zero_division=0,
        output_dict=True,
    )

    matrix = confusion_matrix(
        train_result["y_test"],
        train_result["test_predictions"],
        labels=labels,
    )

    report = {
        "dataset": {
            "sourceFile": str(NORMALIZED_SEQUENCES_FILE),
            "totalSequencesInFile": len(sequences),
            "usableSequences": int(len(x_data)),
            "flatFeatureLength": int(x_data.shape[1]),
            "labelCounts": dict(label_counts),
            "metadata": metadata,
        },
        "training": {
            "modelType": "RandomForestClassifier",
            "randomState": RANDOM_STATE,
            "testSize": TEST_SIZE,
            "trainSize": int(len(train_result["y_train"])),
            "testSizeCount": int(len(train_result["y_test"])),
            "trainAccuracy": float(train_result["train_accuracy"]),
            "testAccuracy": float(train_result["test_accuracy"]),
        },
        "labels": labels,
        "classificationReport": test_report,
        "confusionMatrix": matrix.tolist(),
    }

    return report


def save_outputs(model, labels, label_to_index, index_to_label, report):
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, MODEL_FILE)

    label_map = {
        "labels": labels,
        "labelToIndex": label_to_index,
        "indexToLabel": index_to_label,
    }

    write_json(LABEL_MAP_FILE, label_map)
    write_json(TRAINING_REPORT_FILE, report)


def print_summary(report):
    print("")
    print("Elce gesture model training completed")
    print("-" * 48)

    print(f"Usable sequences: {report['dataset']['usableSequences']}")
    print(f"Flat feature length: {report['dataset']['flatFeatureLength']}")

    print("")
    print("Label counts:")
    for label, count in report["dataset"]["labelCounts"].items():
        print(f"  {label}: {count}")

    print("")
    print(f"Train accuracy: {report['training']['trainAccuracy']:.4f}")
    print(f"Test accuracy:  {report['training']['testAccuracy']:.4f}")

    print("")
    print("Saved files:")
    print(f"  {MODEL_FILE}")
    print(f"  {LABEL_MAP_FILE}")
    print(f"  {TRAINING_REPORT_FILE}")
    print("-" * 48)
    print("Note: Dataset is small, so accuracy is not fully reliable yet.")


def main():
    sequences = read_json(NORMALIZED_SEQUENCES_FILE)

    if not isinstance(sequences, list):
        raise ValueError("normalized_sequences.json must contain a list")

    x_data, y_data, metadata = build_dataset(sequences)
    labels, label_to_index, index_to_label = make_label_maps(y_data)

    if len(labels) < 2:
        raise ValueError("Need at least 2 labels to train a classifier")

    train_result = train_model(x_data, y_data)

    report = build_report(
        sequences=sequences,
        x_data=x_data,
        y_data=y_data,
        metadata=metadata,
        train_result=train_result,
        labels=labels,
    )

    save_outputs(
        model=train_result["model"],
        labels=labels,
        label_to_index=label_to_index,
        index_to_label=index_to_label,
        report=report,
    )

    print_summary(report)


if __name__ == "__main__":
    main()