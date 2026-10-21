from pathlib import Path

import cv2
import numpy as np
from pymongo import MongoClient
from insightface.app import FaceAnalysis


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / "backend" / ".env"
IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"

EXPECTED_EMBEDDING_SIZE = 512


# --------------------------------------------------
# READ MONGODB URI FROM backend/.env
# --------------------------------------------------

def read_env_value(env_path, key):
    """Read a simple KEY=value entry without printing its value."""

    for line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)

        if name.strip() == key:
            value = value.strip()

            # Remove optional matching quotes.
            if (
                len(value) >= 2
                and value[0] == value[-1]
                and value[0] in ("'", '"')
            ):
                value = value[1:-1]

            return value

    return None


# --------------------------------------------------
# MAIN FUNCTION
# --------------------------------------------------

def main():

    if not ENV_PATH.exists():
        raise FileNotFoundError(
            f"Environment file not found: {ENV_PATH}"
        )

    if not IMAGE_DIR.exists():
        raise FileNotFoundError(
            f"Image directory not found: {IMAGE_DIR}"
        )

    mongo_uri = read_env_value(ENV_PATH, "MONGODB_URI")

    if not mongo_uri or not mongo_uri.startswith(
        ("mongodb://", "mongodb+srv://")
    ):
        raise ValueError(
            "A valid MONGODB_URI was not found in backend/.env"
        )

    image_files = sorted(IMAGE_DIR.glob("*.jpg"))

    if not image_files:
        raise RuntimeError(
            f"No JPG images found in {IMAGE_DIR}"
        )

    # --------------------------------------------------
    # INITIALIZE INSIGHTFACE
    # --------------------------------------------------

    print("Initializing InsightFace...")

    face_app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"]
    )

    face_app.prepare(
        ctx_id=-1,
        det_size=(640, 640)
    )

    pending_updates = []

    # --------------------------------------------------
    # CONNECT TO MONGODB
    # --------------------------------------------------

    with MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=10000
    ) as client:

        client.admin.command("ping")

        # Use the database specified in the MongoDB URI.
        database = client.get_default_database()

        if database is None:
            raise RuntimeError(
                "No default database found in MONGODB_URI. "
                "Check backend/.env before continuing."
            )

        db = database
        people_collection = db["people"]

        print("MongoDB connection verified.")
        print("Database:", db.name)
        print("Images found:", len(image_files))

        # --------------------------------------------------
        # GENERATE AND VALIDATE EMBEDDINGS
        # --------------------------------------------------

        print("\n========== IMAGE VALIDATION ==========")

        for image_path in image_files:

            profile_path = (
                f"/images/people/{image_path.name}"
            )

            # Match using the exact profileImage path.
            matches = list(
                people_collection.find(
                    {"profileImage": profile_path},
                    {
                        "_id": 1,
                        "name": 1,
                        "profileImage": 1
                    }
                ).limit(2)
            )

            # Never update zero or multiple matching records.
            if len(matches) != 1:
                print(
                    f"SKIP: {image_path.name} — "
                    f"expected one matching person, "
                    f"found {len(matches)}."
                )
                continue

            image = cv2.imread(str(image_path))

            if image is None:
                print(
                    f"SKIP: Could not read {image_path.name}"
                )
                continue

            faces = face_app.get(image)

            # Avoid choosing an arbitrary face from group images.
            if len(faces) != 1:
                print(
                    f"SKIP: {image_path.name} — "
                    f"expected one face, found {len(faces)}."
                )
                continue

            embedding = np.asarray(
                faces[0].normed_embedding,
                dtype=np.float32
            )

            if (
                embedding.shape != (EXPECTED_EMBEDDING_SIZE,)
                or not np.isfinite(embedding).all()
            ):
                print(
                    f"SKIP: Invalid embedding for "
                    f"{image_path.name}"
                )
                continue

            person = matches[0]

            pending_updates.append(
                (person["_id"], embedding.tolist(), image_path.name)
            )

            print(
                f"READY: {person.get('name', '(unnamed)')} — "
                f"{image_path.name} — "
                f"{len(embedding)} dimensions"
            )

        # --------------------------------------------------
        # FINAL VALIDATION BEFORE ANY DATABASE WRITE
        # --------------------------------------------------

        print("\n========== VALIDATION SUMMARY ==========")
        print("Images found:", len(image_files))
        print("Valid matching records:", len(pending_updates))

        if len(pending_updates) != len(image_files):
            print(
                "\nCancelled: not every image has exactly one "
                "valid matching person. No records were updated."
            )
            return

        # Prevent accidentally overwriting existing embeddings.
        existing_ids = [
            person_id
            for person_id, _, _ in pending_updates
            if people_collection.find_one(
                {
                    "_id": person_id,
                    "faceEmbedding.0": {"$exists": True}
                },
                {"_id": 1}
            )
        ]

        if existing_ids:
            print(
                "\nCancelled: some records already have "
                "face embeddings. No records were updated."
            )
            print("Existing embedding records:", len(existing_ids))
            print(
                "Review them before deciding whether to replace "
                "their embeddings."
            )
            return

        confirmation = input(
            "\nSave these demo embeddings to MongoDB? "
            "Type YES to continue: "
        ).strip()

        if confirmation != "YES":
            print("Cancelled. No records were modified.")
            return

        # --------------------------------------------------
        # SAVE EMBEDDINGS
        # --------------------------------------------------

        updated = 0

        for person_id, embedding, filename in pending_updates:

            # Recheck the record and prevent overwriting an
            # embedding if another process added one meanwhile.
            result = people_collection.update_one(
                {
                    "_id": person_id,
                    "faceEmbedding.0": {"$exists": False}
                },
                {
                    "$set": {
                        "faceEmbedding": embedding
                    }
                }
            )

            if result.matched_count != 1:
                raise RuntimeError(
                    f"Update skipped for {filename}; "
                    "record changed or already has an embedding."
                )

            updated += 1

            print(f"SAVED: {filename}")

        print("\n========== SAVE SUMMARY ==========")
        print("Records updated:", updated)
        print("Embedding dimensions:", EXPECTED_EMBEDDING_SIZE)
        print("Database:", db.name)


if __name__ == "__main__":
    main()