from game import FaceNameGame
from performance import calculate_performance
from adaptive import recommend_difficulty


game = FaceNameGame()

questions = [
    {
        "person_name": "Rahul",
        "options": ["Rahul", "Priya", "Amit", "Neha"],
        "answer": "Rahul"
    },
    {
        "person_name": "Priya",
        "options": ["Rahul", "Priya", "Amit", "Neha"],
        "answer": "Priya"
    },
    {
        "person_name": "Amit",
        "options": ["Rahul", "Priya", "Amit", "Neha"],
        "answer": "Amit"
    }
]

 
current_difficulty = "easy"


for question in questions:

    # Show current difficulty
    print("\n================================")
    print("Current difficulty:", current_difficulty)
    print("================================")

    # Play the question
    game.ask_question(
        person_name=question["person_name"],
        options=question["options"],
        answer=question["answer"],
        patient_id="P001",
        difficulty=current_difficulty
    )

    # Calculate performance after this question
    performance = calculate_performance(game.results)

    # Decide difficulty for NEXT question
    current_difficulty = recommend_difficulty(
        accuracy=performance["accuracy"],
        hints_used=performance["hints_used"],
        current_difficulty=current_difficulty
    )


print("\n========== GAME SUMMARY ==========")

print("Score:", game.score)
print("Total questions:", game.total_questions)


# Final performance
performance = calculate_performance(game.results)

print("\nPerformance:")
print("Accuracy:", performance["accuracy"], "%")

print(
    "Average response time:",
    round(performance["average_response_time"], 2),
    "seconds"
)

print("Total attempts:", performance["total_attempts"])
print("Hints used:", performance["hints_used"])


print("\nFinal difficulty:", current_difficulty)


print("\nRaw game results:")

for result in game.results:
    print(result)