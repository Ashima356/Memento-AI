import random
from dataclasses import dataclass


DIFFICULTY_PAIRS = {
    "easy": 3,
    "medium": 6,
    "hard": 8,
}


@dataclass
class Card:
    card_id: int
    person_id: str
    card_type: str
    content: str
    face_up: bool = False
    matched: bool = False


class FamilyMemoryMatchingGame:
    def __init__(self, people, difficulty="easy"):
        if difficulty not in DIFFICULTY_PAIRS:
            raise ValueError("Invalid difficulty level")

        self.difficulty = difficulty
        self.required_pairs = DIFFICULTY_PAIRS[difficulty]

        self.cards = []
        self.flipped_cards = []

        self.turns = 0
        self.correct_matches = 0
        self.wrong_matches = 0

        self._create_cards(people)

    def _create_cards(self, people):
        eligible_people = []

        for person in people:
            person_id = str(person.get("_id", ""))
            image = person.get("profileImage")
            memories = person.get("memories", [])

            if not person_id or not image:
                continue

            valid_memories = [
                memory
                for memory in memories
                if isinstance(memory, dict)
                and isinstance(memory.get("description"), str)
                and memory["description"].strip()
            ]

            if valid_memories:
                eligible_people.append(
                    {
                        "person_id": person_id,
                        "image": image,
                        "memories": valid_memories,
                    }
                )

        if len(eligible_people) < self.required_pairs:
            raise ValueError(
                f"Need at least {self.required_pairs} people "
                "with photos and personal memories"
            )

        selected_people = random.sample(
            eligible_people,
            self.required_pairs
        )

        card_id = 0

        for person in selected_people:
            memory = random.choice(person["memories"])

            self.cards.append(
                Card(
                    card_id=card_id,
                    person_id=person["person_id"],
                    card_type="photo",
                    content=person["image"],
                )
            )
            card_id += 1

            self.cards.append(
                Card(
                    card_id=card_id,
                    person_id=person["person_id"],
                    card_type="memory",
                    content=memory["description"].strip(),
                )
            )
            card_id += 1

        random.shuffle(self.cards)

    def flip_card(self, card_id):
        if self.is_complete():
            return {
                "status": "completed",
                "message": "All family memories matched!",
            }

        if len(self.flipped_cards) == 2:
            return {
                "status": "wait",
                "message": "Finish the current turn first",
            }

        card = next(
            (item for item in self.cards if item.card_id == card_id),
            None
        )

        if card is None:
            return {
                "status": "invalid",
                "message": "Card not found",
            }

        if card.matched or card.face_up:
            return {
                "status": "invalid",
                "message": "Choose a different face-down card",
            }

        card.face_up = True
        self.flipped_cards.append(card)

        if len(self.flipped_cards) == 1:
            return {
                "status": "first_flip",
                "message": "Choose one more card",
            }

        self.turns += 1

        first, second = self.flipped_cards

        is_match = (
            first.person_id == second.person_id
            and first.card_type != second.card_type
        )

        if is_match:
            first.matched = True
            second.matched = True
            self.correct_matches += 1

            return {
                "status": "match",
                "message": "Wonderful! Family memory matched!",
                "completed": self.is_complete(),
            }

        self.wrong_matches += 1

        return {
            "status": "mismatch",
            "message": "Remember where these cards are!",
            "completed": False,
        }

    def finish_turn(self):
        if len(self.flipped_cards) != 2:
            return False

        for card in self.flipped_cards:
            if not card.matched:
                card.face_up = False

        self.flipped_cards.clear()
        return True

    def is_complete(self):
        return self.correct_matches == self.required_pairs

    def get_board(self):
        return [
            {
                "card_id": card.card_id,
                "face_up": card.face_up,
                "matched": card.matched,
                "card_type": (
                    card.card_type if card.face_up else None
                ),
                "content": (
                    card.content if card.face_up else None
                ),
            }
            for card in self.cards
        ]

    def get_performance(self):
        accuracy = (
            round(
                (self.correct_matches / self.turns) * 100,
                2
            )
            if self.turns
            else 0
        )

        return {
            "game_type": "memory-matching",
            "difficulty": self.difficulty,
            "total_pairs": self.required_pairs,
            "correct_matches": self.correct_matches,
            "wrong_matches": self.wrong_matches,
            "total_turns": self.turns,
            "accuracy": accuracy,
            "completed": self.is_complete(),
        }
