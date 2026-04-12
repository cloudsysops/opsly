#!/usr/bin/env python3
"""Inferencia: lee una línea JSON desde stdin con taskDescription; escribe JSON category+confidence."""
from __future__ import annotations

import json
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "model.pkl"


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "empty stdin"}))
        return 1

    data = json.loads(raw)
    text = str(data.get("taskDescription", ""))

    if not MODEL_PATH.is_file():
        print(json.dumps({"error": f"model not found: {MODEL_PATH}"}))
        return 1

    with open(MODEL_PATH, "rb") as f:
        model_data = pickle.load(f)

    vectorizer = model_data["vectorizer"]
    clf = model_data["classifier"]

    x_vec = vectorizer.transform([text])
    pred = clf.predict(x_vec)[0]
    proba = clf.predict_proba(x_vec)[0]
    confidence = float(max(proba))

    print(
        json.dumps(
            {
                "category": str(pred),
                "confidence": confidence,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
