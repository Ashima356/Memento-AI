import cv2
from insightface.app import FaceAnalysis


class FaceEmbedder:

    def __init__(self):
        self.app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        self.app.prepare(ctx_id=-1)

    def get_embedding(self, image_path):

        image = cv2.imread(image_path)

        if image is None:
            raise ValueError(f"Could not read image: {image_path}")

        faces = self.app.get(image)

        if len(faces) == 0:
            raise ValueError("No face detected")

        if len(faces) > 1:
            raise ValueError(
                "Multiple faces detected. Please use an image with one face."
            )

        return faces[0].embedding