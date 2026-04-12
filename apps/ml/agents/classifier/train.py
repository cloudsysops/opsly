#!/usr/bin/env python3
"""Entrena clasificador TF-IDF + MultinomialNB; escribe model.pkl y metrics.json."""
from __future__ import annotations

import argparse
import json
import os
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_DATASET = ROOT / "datasets" / "training_data.csv"
DEFAULT_OUT = ROOT / "models" / "model.pkl"
METRICS_OUT = ROOT / "models" / "metrics.json"

CATEGORIES = ["infra", "billing", "ai_task", "support", "onboarding"]


def train_classifier(
    dataset_path: Path,
    output_path: Path,
) -> dict[str, float | int | str | list[str]]:
    import pandas as pd
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support
    from sklearn.naive_bayes import MultinomialNB

    df = pd.read_csv(dataset_path)
    if "description" not in df.columns or "category" not in df.columns:
        raise ValueError("CSV must have columns: description, category")

    x_raw = df["description"].astype(str).values
    y = df["category"].astype(str).values

    vectorizer = TfidfVectorizer(
        max_features=1000,
        lowercase=True,
        stop_words="english",
    )
    x_vec = vectorizer.fit_transform(x_raw)

    clf = MultinomialNB()
    clf.fit(x_vec, y)

    y_pred = clf.predict(x_vec)
    accuracy = float(accuracy_score(y, y_pred))
    precision, recall, f1, _ = precision_recall_fscore_support(
        y, y_pred, average="weighted", zero_division=0
    )

    metrics: dict[str, float | int | str | list[str]] = {
        "accuracy": accuracy,
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "num_samples": int(len(df)),
        "num_features": int(x_vec.shape[1]),
        "categories": CATEGORIES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    model_data = {
        "vectorizer": vectorizer,
        "classifier": clf,
        "categories": CATEGORIES,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        pickle.dump(model_data, f)

    with open(METRICS_OUT, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    return metrics


def main() -> int:
    parser = argparse.ArgumentParser(description="Train Opsly task classifier")
    parser.add_argument(
        "--dataset",
        type=Path,
        default=DEFAULT_DATASET,
        help="Path to training CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUT,
        help="Path to write model.pkl",
    )
    args = parser.parse_args()

    if not args.dataset.is_file():
        print(f"[ERROR] Dataset not found: {args.dataset}", file=sys.stderr)
        return 1

    metrics = train_classifier(args.dataset, args.output)
    print(f"[INFO] Trained on {metrics['num_samples']} rows → {args.output}")
    print(f"[METRICS] accuracy={metrics['accuracy']:.4f} f1={metrics['f1']:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
