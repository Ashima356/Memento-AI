def calculate_performance(results):

    total = len(results)

    if total == 0:
        return {
            "accuracy": 0,
            "completion_rate": 0,
            "average_response_time": 0,
            "total_attempts": 0,
            "hints_used": 0,
            "first_attempt_correct": 0,
            "questions_completed": 0
        }

    # Questions answered correctly on the first attempt
    first_correct = sum(
        1 for result in results
        if result.get("correct_first_attempt", False)
    )

    # Questions eventually completed successfully
    completed = sum(
        1 for result in results
        if result.get("correct", False)
    )

    accuracy = (first_correct / total) * 100
    completion_rate = (completed / total) * 100

    average_response_time = sum(
        result.get("response_time", 0)
        for result in results
    ) / total

    total_attempts = sum(
        result.get("attempts", 0)
        for result in results
    )

    hints_used = sum(
        result.get("hints_used", 0)
        for result in results
    )

    return {
        "accuracy": accuracy,
        "completion_rate": completion_rate,
        "average_response_time": average_response_time,
        "total_attempts": total_attempts,
        "hints_used": hints_used,
        "first_attempt_correct": first_correct,
        "questions_completed": completed
    }