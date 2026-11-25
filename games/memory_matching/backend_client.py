import os
from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[2]

PRIVATE_IMAGE_DIR = (
    PROJECT_ROOT / "backend" / "private" / "uploads" / "people"
)

LEGACY_IMAGE_DIR = (
    PROJECT_ROOT / "backend" / "public" / "images" / "people"
)

BASE_URL = os.environ.get(
    "MEMENTO_API_URL",
    "http://127.0.0.1:5000/api/games",
).rstrip("/")

DATA_URL = f"{BASE_URL}/data"
SESSION_URL = f"{BASE_URL}/sessions"


def get_patient_id():
    patient_id = os.environ.get(
        "MEMENTO_PATIENT_ID", ""
    ).strip()

    if not patient_id:
        raise ValueError(
            "MEMENTO_PATIENT_ID is missing. "
            "Select a patient before starting the game."
        )

    return patient_id


def get_headers():
    token = os.environ.get(
        "MEMENTO_TOKEN", ""
    ).strip()

    if not token:
        raise ValueError(
            "MEMENTO_TOKEN is missing. "
            "Log in before starting the game."
        )

    return {
        "Authorization": f"Bearer {token}",
    }


def resolve_image_path(profile_image):
    if not isinstance(profile_image, str):
        return None

    filename = Path(
        profile_image.replace("\\", "/")
    ).name

    if not filename or filename in {".", ".."}:
        return None

    for directory in (
        PRIVATE_IMAGE_DIR,
        LEGACY_IMAGE_DIR,
    ):
        image_path = directory / filename

        if image_path.is_file():
            return str(image_path)

    return None


def fetch_people(patient_id):
    response = requests.get(
        DATA_URL,
        headers=get_headers(),
        params={"patientId": patient_id},
        timeout=10,
    )

    response.raise_for_status()
    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Invalid backend response.")

    if str(data.get("patientId")) != patient_id:
        raise ValueError(
            "Backend returned an unexpected patient ID."
        )

    persons = data.get("persons", [])

    if not isinstance(persons, list):
        raise ValueError(
            "Backend 'persons' must be a list."
        )

    eligible_people = []

    for person in persons:
        if not isinstance(person, dict):
            continue

        person_id = person.get("_id")
        image_path = resolve_image_path(
            person.get("profileImage")
        )

        memories = person.get("memories", [])

        if not isinstance(memories, list):
            continue

        valid_memories = [
            memory
            for memory in memories
            if isinstance(memory, dict)
            and isinstance(
                memory.get("description"), str
            )
            and memory["description"].strip()
        ]

        if (
            not person_id
            or image_path is None
            or not valid_memories
        ):
            continue

        eligible_people.append({
            "_id": str(person_id),
            "profileImage": image_path,
            "memories": valid_memories,
        })

    return eligible_people


def save_game_session(
    patient_id,
    performance,
    starting_difficulty,
    final_difficulty,
):
    total_turns = performance["total_turns"]
    correct_matches = performance["correct_matches"]
    total_pairs = performance["total_pairs"]

    if total_turns < 1:
        raise ValueError(
            "Cannot save a session without completed turns."
        )

    payload = {
        "patientId": patient_id,
        "gameType": "memory-matching",
        "score": performance["accuracy"],
        "totalQuestions": total_turns,
        "correctAnswers": correct_matches,
        "difficulty": starting_difficulty,
        "finalDifficulty": final_difficulty,
        "hintsUsed": 0,
        "totalAttempts": total_turns,
        "completionRate": round(
            (correct_matches / total_pairs) * 100,
            2,
        ),
    }

    response = requests.post(
        SESSION_URL,
        headers=get_headers(),
        json=payload,
        timeout=10,
    )

    response.raise_for_status()
    return response.json()