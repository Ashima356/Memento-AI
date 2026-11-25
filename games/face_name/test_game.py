from pathlib import Path
import os
import random

import requests

from game import FaceNameGame
from performance import calculate_performance
from adaptive import recommend_difficulty


PROJECT_ROOT = Path(__file__).resolve().parents[2]

IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"

BASE_URL = "http://localhost:5000/api/games"
API_URL = f"{BASE_URL}/data"
SESSION_URL = f"{BASE_URL}/sessions"

# Existing demo patient
PATIENT_ID = os.environ.get("MEMENTO_PATIENT_ID", "").strip()


def get_headers():
    token = os.environ.get("MEMENTO_TOKEN", "").strip()

    if not token:
        raise ValueError(
            "MEMENTO_TOKEN is missing. "
            "Set it in PowerShell before running the game."
        )

    return {
        "Authorization": f"Bearer {token}"
    }


def fetch_people():
    if not PATIENT_ID:
        raise ValueError(
            "MEMENTO_PATIENT_ID is missing. "
            "Select a patient before starting the game."
        )
    response = requests.get(
        API_URL,
        headers=get_headers(),
        params={"patientId": PATIENT_ID},
        timeout=10
    )

    response.raise_for_status()
    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Invalid backend response.")

    people = data.get("persons", [])

    if not isinstance(people, list):
        raise ValueError("Backend 'persons' must be a list.")

    valid_people = []

    for person in people:
        if not isinstance(person, dict):
            continue

        name = person.get("name")
        person_id = person.get("_id") or person.get("id")

        if not isinstance(name, str) or not name.strip():
            continue

        if not person_id:
            print(f"Skipping {name}: missing person ID.")
            continue

        profile_image = person.get("profileImage")

        if not isinstance(profile_image, str) or not profile_image.strip():
            print(f"Skipping {name}: no profile image.")
            continue

        # Keep image access inside the known local directory.
        filename = Path(
            profile_image.replace("\\", "/")
        ).name

        image_path = IMAGE_DIR / filename

        if not image_path.is_file():
            print(f"Skipping {name}: image not found.")
            continue

        valid_person = person.copy()
        valid_person["localImagePath"] = image_path
        valid_person["id"] = str(person_id)

        valid_people.append(valid_person)

    return valid_people


def build_questions(people):
    questions = []

    for person in people:
        correct_name = person["name"].strip()

        other_names = list({
            p["name"].strip()
            for p in people
            if p["name"].strip() != correct_name
        })

        distractors = random.sample(
            other_names,
            k=min(3, len(other_names))
        )

        options = [correct_name] + distractors
        random.shuffle(options)

        if len(options) < 2:
            continue

        questions.append({
            "person_name": correct_name,
            "person_id": person["id"],
            "image_path": person["localImagePath"],
            "options": options,
            "answer": correct_name
        })

    random.shuffle(questions)

    return questions


def save_game_session(performance, total_questions, difficulty):
    payload = {
        "patientId": PATIENT_ID,
        "gameType": "face-name",
        "score": round(performance["accuracy"], 2),
        "totalQuestions": total_questions,
        "correctAnswers": performance["first_attempt_correct"],
        "difficulty": difficulty,
        "hintsUsed": performance["hints_used"]
    }

    try:
        response = requests.post(
            SESSION_URL,
            headers=get_headers(),
            json=payload,
            timeout=10
        )

        response.raise_for_status()
        print("Game session saved successfully!")

    except requests.RequestException as error:
        print("Could not save game session:", error)


def main():
    print("\n================================")
    print("     MEMENTO-AI MEMORY GAME")
    print("================================")

    try:
        people = fetch_people()

    except requests.HTTPError as error:
        status_code = (
            error.response.status_code
            if error.response is not None
            else None
        )

        if status_code == 401:
            print("Authentication failed. Check your JWT token.")
        elif status_code == 403:
            print("Access denied.")
        elif status_code == 404:
            print("Patient not found or access denied.")
        else:
            print("Backend HTTP error:", error)
        return

    except requests.RequestException as error:
        print("Could not fetch people:", error)
        print("Make sure the Node.js backend is running.")
        return

    except (ValueError, TypeError) as error:
        print("Cannot start game:", error)
        return

    print("People with valid images:", len(people))

    if len({person["name"].strip() for person in people}) < 2:
        print(
            "At least 2 familiar people with different names "
            "and valid profile images are required."
        )
        return

    questions = build_questions(people)

    if not questions:
        print("Not enough valid questions to start the game.")
        return

    game = FaceNameGame()
    current_difficulty = "easy"
    starting_difficulty = current_difficulty

    for question_number, question in enumerate(questions, start=1):
        print("\n================================")
        print(f"Question {question_number}/{len(questions)}")
        print("Current difficulty:", current_difficulty)
        print("================================")

        game.ask_question(
            person_name=question["person_name"],
            options=question["options"],
            answer=question["answer"],
            patient_id=PATIENT_ID,
            difficulty=current_difficulty,
            image_path=question["image_path"]
        )

        performance = calculate_performance(game.results)

        current_difficulty = recommend_difficulty(
            accuracy=performance["accuracy"],
            hints_used=performance["hints_used"],
            current_difficulty=current_difficulty
        )

    performance = calculate_performance(game.results)

    print("\n========== GAME SUMMARY ==========")
    print("Questions completed:", performance["questions_completed"])
    print("First-attempt correct:", performance["first_attempt_correct"])
    print("Total questions:", game.total_questions)
    print("Accuracy:", round(performance["accuracy"], 2), "%")
    print("Completion rate:", round(performance["completion_rate"], 2), "%")
    print(
        "Average response time:",
        round(performance["average_response_time"], 2),
        "seconds"
    )
    print("Total attempts:", performance["total_attempts"])
    print("Hints used:", performance["hints_used"])
    print("Final difficulty:", current_difficulty)

    save_game_session(
        performance=performance,
        total_questions=game.total_questions,
        difficulty=starting_difficulty
    )


if __name__ == "__main__":
    main()