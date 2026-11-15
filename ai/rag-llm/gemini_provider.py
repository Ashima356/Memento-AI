
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load the API key from this folder's .env file.
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Check the .env file."
    )

# Gemini-specific code stays inside this provider module.
client = genai.Client(api_key=API_KEY)
MODEL_NAME = "gemini-3.5-flash"


def generate_answer(prompt: str) -> str:
    """Generate an answer using Gemini."""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
    )

    answer = response.text

    if not answer:
        raise RuntimeError("Gemini returned an empty response.")

    return answer.strip()


if __name__ == "__main__":
    print("Testing Gemini connection...")

    answer = generate_answer(
        "Reply with exactly: Gemini connection successful."
    )

    print("Gemini response:", answer)
