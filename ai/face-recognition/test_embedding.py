from embeddings import FaceEmbedder


embedder = FaceEmbedder()

embedding = embedder.get_embedding(
    "ai/face-recognition/test_images/test.jpeg"
)

print("Embedding shape:", embedding.shape)

print("\nFirst 10 values:")
print(embedding[:10])