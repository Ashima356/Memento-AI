def calculate_performance(results):

    total = len(results)

    if total == 0:
        return {
            "accuracy": 0,
            "average_response_time": 0,
            "total_attempts": 0,
            "hints_used": 0
        }

    correct = sum(
        1 for result in results
        if result["correct"]
    )

    accuracy = (correct / total) * 100

    average_response_time = sum(
        result["response_time"]
        for result in results
    ) / total

    total_attempts = sum(
        result["attempts"]
        for result in results
    )

    hints_used = sum(
        result["hints_used"]
        for result in results
    )

    return {
        "accuracy": accuracy,
        "average_response_time": average_response_time,
        "total_attempts": total_attempts,
        "hints_used": hints_used
    }