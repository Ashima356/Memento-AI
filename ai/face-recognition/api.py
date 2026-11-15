from fastapi import FastAPI, UploadFile, File, HTTPException
from embeddings import FaceEmbedder

app = FastAPI(
    title="Memento-AI Face Recognition API"
)

# Load the InsightFace model once
embedder = FaceEmbedder()

MAX_IMAGE_SIZE = 5 * 1024 * 1024


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Memento-AI Face Recognition"
    }


@app.post("/embed")
async def generate_embedding(
    image: UploadFile = File(...)
):
    # Accept only JPEG and PNG
    if image.content_type not in (
        "image/jpeg",
        "image/png"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are allowed"
        )

    # Limit uploaded file size
    image_bytes = await image.read(MAX_IMAGE_SIZE + 1)

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 5 MB"
        )

    try:
        embedding = embedder.get_embedding_from_bytes(
            image_bytes
        )

        return {
            "model": "buffalo_l",
            "embedding": embedding.tolist(),
            "dimensions": len(embedding)
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )