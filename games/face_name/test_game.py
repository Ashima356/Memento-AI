from pathlib import Path
import random

import requests

from game import FaceNameGame
from performance import calculate_performance
from adaptive import recommend_difficulty


PROJECT_ROOT = Path(__file__).resolve().parents[2]
IMAGE_DIR = PROJECT_ROOT / "backend" / "public" / "images" / "people"
API_URL = "http://localhost:5000/api/games/data"


def fetch_people():
    response = requests.get(API_URL, timeout=10)
    response.raise_for_status()

    data = response.json()
    people = data.get("people", [])

    valid_people = []

    for person in people:
        name = person.get("name")

        if not isinstance(name, str) or not name.strip():
            continue

        profile_image = person.get("profileImage")

        if not profile_image:
            print(f"Skipping {name}: no profile image.")
            continue

        # Resolve only the image filename inside the known image directory.
        filename = Path(profile_image.replace("\\", "/")).name
        image_path = IMAGE_DIR / filename

        if not image_path.is_file():
            print(f"Skipping {name}: image not found.")
            continue

        person["localImagePath"] = image_path
        valid_people.append(person)

    return valid_people


def build_questions(people):
    questions = []

    for person in people:
        correct_name = person["name"].strip()

        other_names = [
            p["name"].strip()
            for p in people
            if p["name"].strip() != correct_name
        ]

        # Select up to three different distractor names.
        distractors = random.sample(
            other_names,
            k=min(3, len(other_names))
        )

        options = [correct_name] + distractors

        # Shuffle so the correct answer is not always option 1.
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

    # Shuffle question order as well.
    random.shuffle(questions)

    return questions


def main():
    try:
        people = fetch_people()

    except requests.RequestException as error:
        print("Could not fetch people from backend:", error)
        print("Please make sure the backend is running.")
        return

    except (ValueError, TypeError) as error:
        print("Invalid backend response:", error)
        return

    print("People with valid images:", len(people))

    questions = build_questions(people)

    if not questions:
        print("Not enough people with valid images to start the game.")
        return

    game = FaceNameGame()
    current_difficulty = "easy"

    # Temporary demo ID; replace when a verified patient association
    # is available from the backend.
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