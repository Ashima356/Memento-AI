from pathlib import Path
import os
import random

import requests

from game import FaceNameGame
from performance import calculate_performance
from adaptive import recommend_difficulty


PROJECT_ROOT = Path(__file__).resolve().parents[2]
IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"
API_URL = "http://localhost:5000/api/games/data"


def fetch_people():
    # Read JWT from an environment variable.
    # Never hardcode login tokens in source code.
    token = os.environ.get("MEMENTO_TOKEN", "").strip()

    if not token:
        raise ValueError(
            "MEMENTO_TOKEN is missing. "
            "Set it in PowerShell before running the game."
        )

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(
        API_URL,
        headers=headers,
        timeout=10
    )
    response.raise_for_status()

    data = response.json()

    if not isinstance(data, dict):
        raise ValueError("Backend returned an invalid JSON structure.")

    people = data.get("people", [])

    if not isinstance(people, list):
        raise ValueError("Backend 'people' must be a list.")

    valid_people = []

    for person in people:
        if not isinstance(person, dict):
            continue

        name = person.get("name")

        if not isinstance(name, str) or not name.strip():
            continue

        profile_image = person.get("profileImage")

        if not isinstance(profile_image, str) or not profile_image.strip():
            print(f"Skipping {name}: no profile image.")
            continue

        # Resolve image filename inside the known image directory.
        filename = Path(
            profile_image.replace("\\", "/")
        ).name

        image_path = IMAGE_DIR / filename

        if not image_path.is_file():
            print(f"Skipping {name}: image not found.")
            continue

        person_id = person.get("id")

        if not person_id:
            print(f"Skipping {name}: missing person ID.")
            continue

        valid_person = person.copy()
        valid_person["localImagePath"] = image_path
        valid_people.append(valid_person)

    return valid_people


def build_questions(people):
    questions = []

    for person in people:
        correct_name = person["name"].strip()

        # Use unique names to avoid duplicate options.
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
            "person_id": str(person["id"]),
            "image_path": person["localImagePath"],
            "options": options,
            "answer": correct_name
        })

    random.shuffle(questions)

    return questions


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
            print("Authentication failed.")
            print("Your login token may be missing, invalid, or expired.")
        else:
            print("Backend returned an HTTP error:", error)
        return

    except requests.RequestException as error:
        print("Could not fetch people from backend:", error)
        print("Make sure the Node.js backend is running.")
        return

    except (ValueError, TypeError) as error:
        print("Cannot start game:", error)
        return

    print("People with valid images:", len(people))

    if len({
        person["name"].strip()
        for person in people
    }) < 2:
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

    # Temporary demo ID.
    # Replace after patient authentication is integrated.
    patient_id = "demo-patient"

    for question_number, question in enumerate(questions, start=1):
        print("\n================================")
        print(f"Question {question_number}/{len(questions)}")
        print("Current difficulty:", current_difficulty)
        print("================================")

        game.ask_question(
            person_name=question["person_name"],
            options=question["options"],
            answer=question["answer"],
            patient_id=patient_id,
            difficulty=current_difficulty,
            image_path=question["image_path"]
        )

        performance = calculate_performance(game.results)

        current_difficulty = recommend_difficulty(
            accuracy=performance["accuracy"],
            hints_used=performance["hints_used"],
            current_difficulty=current_difficulty
        )

    print("\n========== GAME SUMMARY ==========")
    print("Score:", game.score)
    print("Total questions:", game.total_questions)

    performance = calculate_performance(game.results)

    print("\nPerformance:")
    print("Accuracy:", round(performance["accuracy"], 2), "%")
    print(
        "Average response time:",
        round(performance["average_response_time"], 2),
        "seconds"
    )
    print("Total attempts:", performance["total_attempts"])
    print("Hints used:", performance["hints_used"])
    print("Final difficulty:", current_difficulty)


if __name__ == "__main__":
    main()