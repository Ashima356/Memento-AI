from embeddings import FaceEmbedder
from matcher import cosine_similarity


embedder = FaceEmbedder()


embedding1 = embedder.get_embedding(
    r"C:\Users\hp\Downloads\WhatsApp Image 2026-10-22 at 00.02.21.jpeg"
)

embedding2 = embedder.get_embedding(
    r"C:\Users\hp\Downloads\WhatsApp Image 2026-10-22 at 00.02.55.jpeg"
)


similarity = cosine_similarity(embedding1, embedding2)

print("Cosine similarity:", similarity)