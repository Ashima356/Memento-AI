from pathlib import Path

import cv2
import numpy as np
from pymongo import MongoClient
from insightface.app import FaceAnalysis


ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / "backend" / ".env"
IMAGE_DIR = ROOT / "backend" / "public" / "images" / "people"

# Initial demo threshold only; calibrate with separate test images.
MATCH_THRESHOLD = 0.45


def read_env_value(path, key):
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)

        if name.strip() == key:
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1]:
                if value[0] in ("'", '"'):
                    value = value[1:-1]
            return value

    return None


def extract_embedding(face_app, image_path):
    image = cv2.imread(str(image_path))

    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    faces = face_app.get(image)

    if len(faces) != 1:
        raise ValueError(
            f"Expected exactly one face; detected {len(faces)}."
        )

    embedding = np.asarray(
        faces[0].normed_embedding,
        dtype=np.float32
    )

    if embedding.shape != (512,) or not np.isfinite(embedding).all():
        raise ValueError("Invalid face embedding.")

    return embedding


def cosine_similarity(first, second):
    first = np.asarray(first, dtype=np.float32)
    second = np.asarray(second, dtype=np.float32)

    denominator = np.linalg.norm(first) * np.linalg.norm(second)

    if denominator == 0:
        return 0.0

    return float(np.dot(first, second) / denominator)


def main():
    filename = input(
        "Enter image filename (e.g. aarav-mehta.jpg): "
    ).strip()

    # Restrict input to an image filename inside the demo image folder.
    if Path(filename).name != filename:
        print("Please enter a filename only.")
        return

    image_path = IMAGE_DIR / filename

    if not image_path.is_file():
        print("Image not found:", filename)
        return

    mongo_uri = read_env_value(ENV_FILE, "MONGODB_URI")

    if not mongo_uri:
        raise ValueError("MONGODB_URI missing from backend/.env")

    face_app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"]
    )
    face_app.prepare(ctx_id=-1, det_size=(640, 640))

    query_embedding = extract_embedding(face_app, image_path)

    with MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=10000
    ) as client:
        client.admin.command("ping")
        db = client.get_default_database()

        if db is None:
            raise RuntimeError("No default MongoDB database configured.")

        people = list(
            db["people"].find(
                {"faceEmbedding.0": {"$exists": True}},
                {"name": 1, "faceEmbedding": 1}
            )
        )

    if not people:
        print("No saved face embeddings found.")
        return

    scores = []

    for person in people:
        stored = np.asarray(
            person.get("faceEmbedding", []),
            dtype=np.float32
        )

        if stored.shape != (512,) or not np.isfinite(stored).all():
            continue

        score = cosine_similarity(query_embedding, stored)
        scores.append((score, person.get("name", "Unknown")))

    if not scores:
        print("No valid embeddings found.")
        return

    scores.sort(reverse=True, key=lambda item: item[0])
    best_score, best_name = scores[0]

    print("\n========== MATCH RESULT ==========")
    print("Best candidate:", best_name)
    print("Cosine similarity:", round(best_score, 4))

    if best_score >= MATCH_THRESHOLD:
        print("Result: MATCH (demo threshold)")
    else:
        print("Result: UNKNOWN / NO CONFIDENT MATCH")

    print("\nAll candidate scores:")
    for score, name in scores:
        print(f"{name}: {score:.4f}")


if __name__ == "__main__":
    main()