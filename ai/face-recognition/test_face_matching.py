from pathlib import Path

import cv2
import numpy as np
from pymongo import MongoClient
from insightface.app import FaceAnalysis


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"


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


def get_embedding(face_app, image_path):
    image = cv2.imread(str(image_path))

    if image is None:
        raise ValueError(f"Cannot read image: {image_path}")

    faces = face_app.get(image)

    if len(faces) != 1:
        raise ValueError(
            f"Expected one face in {image_path.name}, "
            f"found {len(faces)}"
        )

    embedding = np.asarray(
        faces[0].normed_embedding,
        dtype=np.float32
    )

    if embedding.shape != (512,):
        raise ValueError("Expected a 512-dimensional embedding.")

    return embedding


def cosine_similarity(first, second):
    first = np.asarray(first, dtype=np.float32)
    second = np.asarray(second, dtype=np.float32)

    denominator = np.linalg.norm(first) * np.linalg.norm(second)

    if denominator == 0:
        return 0.0

    return float(np.dot(first, second) / denominator)


def main():
    mongo_uri = read_env_value(ENV_PATH, "MONGODB_URI")

    if not mongo_uri:
        raise ValueError("MONGODB_URI not found in backend/.env")

    face_app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"]
    )
    face_app.prepare(ctx_id=-1, det_size=(640, 640))

    with MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=10000
    ) as client:

        client.admin.command("ping")
        db = client.get_default_database()

        if db is None:
            raise RuntimeError("No default MongoDB database configured.")

        collection = db["people"]

        people = list(
            collection.find(
                {
                    "faceEmbedding.0": {"$exists": True},
                    "profileImage": {"$type": "string"}
                },
                {
                    "name": 1,
                    "profileImage": 1,
                    "faceEmbedding": 1
                }
            )
        )

        if len(people) < 2:
            raise RuntimeError(
                "At least two people with face embeddings are required."
            )

        print("People with saved embeddings:", len(people))

        # Compare each saved embedding against the embedding
        # generated again from that person's source image.
        for person in people:
            profile_path = person["profileImage"]
            filename = Path(profile_path).name
            image_path = IMAGE_DIR / filename

            stored = np.asarray(
                person["faceEmbedding"],
                dtype=np.float32
            )

            if stored.shape != (512,):
                print(f"\nINVALID embedding: {person.get('name')}")
                continue

            fresh = get_embedding(face_app, image_path)
            score = cosine_similarity(stored, fresh)

            print(f"\nPerson: {person.get('name', 'Unknown')}")
            print("Image:", filename)
            print("Stored dimensions:", len(stored))
            print("Same-image cosine similarity:", round(score, 4))

        print("\nVerification complete.")


if __name__ == "__main__":
    main()