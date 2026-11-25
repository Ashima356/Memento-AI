from detector import FaceDetector


detector = FaceDetector()

image, faces = detector.detect(r"C:\Users\hp\Memento-AI\ai\face-recognition\test_images\test.jpeg")

print("Number of faces detected:", len(faces))

for i, face in enumerate(faces):
    print(f"\nFace {i + 1}")
    print("Bounding box:", face.bbox)