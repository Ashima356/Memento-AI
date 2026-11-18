import cv2
import numpy as np
from insightface.app import FaceAnalysis

EXPECTED_EMBEDDING_SIZE = 512

_face_app = None


def get_face_model():
    global _face_app

    if _face_app is None:
        model = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )
        model.prepare(
            ctx_id=-1,
            det_size=(640, 640)
        )
        _face_app = model

    return _face_app


def generate_face_embedding(image_bytes):
    if not image_bytes:
        raise ValueError("Image data is required.")

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise ValueError("Invalid or unsupported image.")

    faces = get_face_model().get(image)

    if len(faces) != 1:
        raise ValueError(
            f"Expected exactly one face; detected {len(faces)}."
        )

    embedding = np.asarray(
        faces[0].normed_embedding,
        dtype=np.float32
    )

    if (
        embedding.shape != (EXPECTED_EMBEDDING_SIZE,)
        or not np.isfinite(embedding).all()
    ):
        raise ValueError("Invalid face embedding.")

    return embedding.tolist()