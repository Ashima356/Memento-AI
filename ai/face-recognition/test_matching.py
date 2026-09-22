from embeddings import FaceEmbedder
from matcher import cosine_similarity


embedder = FaceEmbedder()


embedding1 = embedder.get_embedding(
    "ai/face-recognition/test_images/person4.jpeg"
)

embedding2 = embedder.get_embedding(
    "ai/face-recognition/test_images/person5_b.jpg"
)


similarity = cosine_similarity(embedding1, embedding2)

print("Cosine similarity:", similarity)