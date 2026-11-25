def recommend_difficulty(
    accuracy,
    hints_used,
    current_difficulty
):

    # High performance → increase difficulty
    if accuracy >= 80 and hints_used <= 1:

        if current_difficulty == "easy":
            return "medium"

        if current_difficulty == "medium":
            return "hard"

        return "hard"

    # Low performance → decrease difficulty
    if accuracy < 50:

        if current_difficulty == "hard":
            return "medium"

        if current_difficulty == "medium":
            return "easy"

        return "easy"

    # Moderate performance → keep same difficulty
    return current_difficulty