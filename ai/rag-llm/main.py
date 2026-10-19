
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from rag_service import generate_rag_answer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="Memento-AI AI Service",
    description="Text embeddings and memory-grounded answers.",
    version="1.1.0",
)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimensions: int
    model: str


class RAGRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    memories: list[dict] = Field(default_factory=list, max_length=10)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Memento-AI AI Service",
    }


@app.post("/embed", response_model=EmbeddingResponse)
def generate_embedding(request: EmbeddingRequest):
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    vector = model.encode(
        text,
        normalize_embeddings=True,
    ).tolist()

    return {
        "embedding": vector,
        "dimensions": len(vector),
        "model": MODEL_NAME,
    }



@app.post("/answer")
def generate_memory_answer(request: RAGRequest):
    query = request.query.strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty.",
        )

    try:
        answer = generate_rag_answer(
            query=query,
            memories=request.memories,
        )

        return {
            "query": query,
            "answer": answer,
            "memories_used": len(request.memories),
            "provider": "gemini",
        }

    except Exception as exc:
        logger.exception(
            "RAG answer generation failed: %s",
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail="Answer generation failed. Check AI service logs.",
        )
