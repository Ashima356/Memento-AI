from adaptive import recommend_difficulty


# Test 1: High performance
level = recommend_difficulty(
    accuracy=90,
    hints_used=0,
    current_difficulty="easy"
)

print("Test 1:", level)

# Test 2: Low performance
level = recommend_difficulty(
    accuracy=30,
    hints_used=3,
    current_difficulty="medium"
)

print("Test 2:", level)


# Test 3: Moderate performance
level = recommend_difficulty(
    accuracy=65,
    hints_used=2,
    current_difficulty="medium"
)

print("Test 3:", level)