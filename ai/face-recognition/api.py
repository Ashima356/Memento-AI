from fastapi import FastAPI, File, HTTPException, UploadFile
from face_embedding_service import generate_face_embedding

app = FastAPI(
    title="Memento-AI Face Embedding Service",
    version="1.0.0"
)

MAX_IMAGE_SIZE = 5 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embeddings")
async def create_embedding(
    file: UploadFile = File(...)
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPEG, PNG and WebP images are allowed."
        )

    image_bytes = await file.read(MAX_IMAGE_SIZE + 1)

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 5 MB limit."
        )

    try:
        embedding = generate_face_embedding(image_bytes)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error)
        )
    finally:
        await file.close()

    return {
        "embedding": embedding,
        "dimensions": len(embedding)
    }