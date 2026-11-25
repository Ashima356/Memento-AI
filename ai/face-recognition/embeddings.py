import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEmbedder:

    def __init__(self):
        # Load InsightFace model once
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        self.app.prepare(
            ctx_id=-1,
            det_size=(640, 640)
        )

    def get_embedding_from_image(self, image):
        # Validate decoded image
        if image is None or image.size == 0:
            raise ValueError("Invalid image")

        # Detect faces
        faces = self.app.get(image)

        if len(faces) == 0:
            raise ValueError("No face detected")

        if len(faces) > 1:
            raise ValueError(
                "Multiple faces detected. Please use one face."
            )

        # Return normalized face embedding
        return faces[0].normed_embedding

    def get_embedding(self, image_path):
        # Support existing image-path based tests
        image = cv2.imread(image_path)

        if image is None:
            raise ValueError(
                f"Could not read image: {image_path}"
            )

        return self.get_embedding_from_image(image)

    def get_embedding_from_bytes(self, image_bytes):
        # Support images uploaded through FastAPI
        array = np.frombuffer(
            image_bytes,
            dtype=np.uint8
        )

        image = cv2.imdecode(
            array,
            cv2.IMREAD_COLOR
        )

        if image is None:
            raise ValueError("Invalid uploaded image")

        return self.get_embedding_from_image(image)