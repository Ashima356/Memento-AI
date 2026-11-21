import time


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
        difficulty="easy"
    ):

        print("\nWho is this person?")
        print("Options:")

        for i, option in enumerate(options, start=1):
            print(f"{i}. {option}")

        attempts = 0
        hints_used = 0

        start_time = time.time()

        while True:

            try:
                choice = int(input("Enter your answer: "))

                if choice < 1 or choice > len(options):
                    print(
                        f"Invalid choice. Please enter a number "
                        f"between 1 and {len(options)}."
                    )
                    continue

                break

            except ValueError:
                print("Please enter a valid number.")

        attempts += 1

        selected_answer = options[choice - 1]

        while selected_answer != answer:

            print("Wrong! Try again.")

            if attempts == 2:
                hints_used += 1
                print(
                    f"Hint: The answer starts with '{answer[0]}'."
                )

            while True:

                try:
                    choice = int(input("Enter your answer: "))

                    if choice < 1 or choice > len(options):
                        print(
                            f"Invalid choice. Please enter a number "
                            f"between 1 and {len(options)}."
                        )
                        continue

                    break

                except ValueError:
                    print("Please enter a valid number.")

            attempts += 1
            selected_answer = options[choice - 1]

        self.score += 1
        correct = True

        print("Correct!")

        end_time = time.time()

        response_time = end_time - start_time

        self.total_questions += 1

        self.results.append({
            "patient_id": patient_id,
            "game_type": "face_name",
            "difficulty": difficulty,
            "correct": correct,
            "response_time": response_time,
            "attempts": attempts,
            "hints_used": hints_used
        })

        return correct