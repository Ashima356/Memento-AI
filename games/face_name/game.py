import time
from pathlib import Path


class FaceNameGame:

    def __init__(self):
        self.score = 0
        self.total_questions = 0
        self.results = []

    def ask_question(
        self,
        person_name,
        options,
        answer,
        patient_id,
        difficulty="easy",
        image_path=None
    ):
        # Validate question data
        if not options:
            raise ValueError("Options cannot be empty.")

        if answer not in options:
            raise ValueError(
                "The correct answer must be present in options."
            )

        print("\n================================")
        print("          FACE NAME GAME")
        print("================================")

        # Display the person's image
        if image_path:
            path = Path(image_path)

            if path.is_file():
                try:
                    from PIL import Image

                    with Image.open(path) as image:
                        image.show()

                    print("Person's image opened:", path.name)

                except Exception as error:
                    print("Could not open image viewer:", error)
                    print("Image path:", path.resolve())
            else:
                print("Image not found:", path)

        print("\nWho is this person?")
        print("Options:")

        for index, option in enumerate(options, start=1):
            print(f"{index}. {option}")

        attempts = 0
        hints_used = 0
        correct_first_attempt = False

        start_time = time.time()

        # Keep asking until the correct answer is selected
        while True:
            try:
                choice = int(input("Enter your answer (number): "))

                if not 1 <= choice <= len(options):
                    print(
                        f"Invalid choice! Enter a number "
                        f"between 1 and {len(options)}."
                    )
                    continue

            except ValueError:
                print("Invalid input! Please enter a number.")
                continue

            attempts += 1
            selected_answer = options[choice - 1]

            if selected_answer == answer:
                print("Correct!")

                if attempts == 1:
                    correct_first_attempt = True

                break

            print("Wrong answer! Try again.")

            # Show a hint after the second incorrect attempt
            if attempts == 2 and hints_used == 0:
                hints_used += 1
                print(
                    f"Hint: The person's name starts with "
                    f"'{answer[0]}'."
                )

        response_time = time.time() - start_time

        # Update game statistics
        self.score += 1
        self.total_questions += 1

        result = {
            "patient_id": str(patient_id),
            "game_type": "face_name",
            "difficulty": difficulty,
            "correct": True,
            "correct_first_attempt": correct_first_attempt,
            "response_time": response_time,
            "attempts": attempts,
            "hints_used": hints_used
        }

        self.results.append(result)

        print("Attempts:", attempts)
        print("Hints used:", hints_used)
        print(f"Response time: {response_time:.2f} seconds")

        return True