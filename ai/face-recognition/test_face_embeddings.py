from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis


PROJECT_ROOT = Path(__file__).resolve().parents[2]
IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)
app.prepare(ctx_id=-1, det_size=(640, 640))

image_files = sorted(IMAGE_DIR.glob("*.jpg"))

if not image_files:
    raise SystemExit(f"No JPG images found in: {IMAGE_DIR}")

embeddings = {}

for image_path in image_files:
    image = cv2.imread(str(image_path))

    if image is None:
        print(f"\n[ERROR] Could not read: {image_path.name}")
        continue

    faces = app.get(image)

    print(f"\nImage: {image_path.name}")
    print(f"Faces detected: {len(faces)}")

    if len(faces) == 0:
        print("No face detected. Skipping this image.")
        continue

    if len(faces) > 1:
        print("Multiple faces detected. Skipping to avoid ambiguity.")
        continue

    embedding = np.asarray(faces[0].normed_embedding, dtype=np.float32)

    embeddings[image_path.name] = embedding

    print("Embedding shape:", embedding.shape)
    print("Embedding norm:", round(float(np.linalg.norm(embedding)), 4))
    print("Embedding generated successfully.")

print("\n========== SUMMARY ==========")
print("Images found:", len(image_files))
print("Valid face embeddings:", len(embeddings))

for filename in embeddings:
    print("-", filename)