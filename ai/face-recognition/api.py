import numpy as np
from typing import Dict, List

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field

from embeddings import FaceEmbedder
from matcher import cosine_similarity


# Initialize FastAPI
app = FastAPI(
    title="Memento-AI Face Recognition API"
)

# Load InsightFace model once
embedder = FaceEmbedder()

MAX_IMAGE_SIZE = 5 * 1024 * 1024
EMBEDDING_DIMENSIONS = 512


# -----------------------------------
# 1. Health Check
# -----------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Memento-AI Face Recognition"
    }


# -----------------------------------
# 2. Generate Face Embedding
# -----------------------------------

@app.post("/embed")
async def generate_embedding(
    image: UploadFile = File(...)
):
    # Accept JPEG and PNG images only
    if image.content_type not in (
        "image/jpeg",
        "image/png"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are allowed"
        )

    # Limit image size to 5 MB
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


# -----------------------------------
# 3. Face Matching Request Model
# -----------------------------------

class FaceMatchRequest(BaseModel):
    embedding: List[float] = Field(
        min_length=EMBEDDING_DIMENSIONS,
        max_length=EMBEDDING_DIMENSIONS
    )

    known_faces: Dict[str, List[float]]

    threshold: float = Field(
        default=0.5,
        ge=-1.0,
        le=1.0
    )


# -----------------------------------
# 4. Match Face Against Known People
# -----------------------------------

@app.post("/match")
def match_face(request: FaceMatchRequest):

    query = np.asarray(
        request.embedding,
        dtype=np.float64
    )

    # Validate query embedding
    if (
        not np.all(np.isfinite(query))
        or np.linalg.norm(query) == 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid query embedding"
        )

    best_person = None
    best_score = -1.0

    # Compare against all registered faces
    for person_id, known_embedding in request.known_faces.items():

        if len(known_embedding) != EMBEDDING_DIMENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid embedding dimensions for {person_id}"
            )

        known = np.asarray(
            known_embedding,
            dtype=np.float64
        )

        if (
            not np.all(np.isfinite(known))
            or np.linalg.norm(known) == 0
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid embedding for {person_id}"
            )

        score = cosine_similarity(
            query,
            known
        )

        if score > best_score:
            best_score = score
            best_person = person_id

    # No known faces or similarity below threshold
    if (
        best_person is None
        or best_score < request.threshold
    ):
        return {
            "matched": False,
            "person_id": None,
            "similarity": (
                None
                if best_person is None
                else best_score
            )
        }

    # Match found
    return {
        "matched": True,
        "person_id": best_person,
        "similarity": best_score
    }