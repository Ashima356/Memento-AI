import tkinter as tk
from tkinter import messagebox
from pathlib import Path

from PIL import Image, ImageTk

from game import FamilyMemoryMatchingGame, DIFFICULTY_PAIRS
from backend_client import (
    get_patient_id,
    fetch_people,
    save_game_session,
)


LEVELS = ["easy", "medium", "hard"]

GRID_SIZES = {
    "easy": (2, 3),
    "medium": (3, 4),
    "hard": (4, 4),
}


class MemoryMatchingBackend:
    def __init__(self, root):
        self.root = root
        self.root.title("Memento-AI | Family Memory Match")
        self.root.geometry("1050x850")
        self.root.minsize(800, 680)
        self.root.configure(bg="#F5F1FF")

        self.patient_id = None
        self.people = []
        self.difficulty = "easy"
        self.game = None
        self.buttons = {}
        self.photo_images = {}
        self.waiting = False
        self.round_number = 0

        tk.Label(
            root,
            text="Family Memory Flip & Match",
            font=("Arial", 24, "bold"),
            bg="#F5F1FF",
            fg="#43306B",
        ).pack(pady=(18, 6))

        self.level_label = tk.Label(
            root,
            font=("Arial", 14, "bold"),
            bg="#F5F1FF",
            fg="#594A75",
        )
        self.level_label.pack(pady=5)

        self.status = tk.Label(
            root,
            text="Loading family memories...",
            font=("Arial", 14, "bold"),
            bg="#F5F1FF",
            fg="#43306B",
            wraplength=900,
        )
        self.status.pack(pady=8)

        self.board = tk.Frame(root, bg="#F5F1FF")
        self.board.pack(
            expand=True,
            fill="both",
            padx=24,
            pady=12,
        )

        self.next_button = tk.Button(
            root,
            text="Next Round",
            font=("Arial", 14, "bold"),
            bg="#7555B5",
            fg="white",
            activebackground="#A18BD1",
            relief="flat",
            padx=28,
            pady=10,
            command=self.start_next_round,
            state="disabled",
        )
        self.next_button.pack(pady=(0, 20))

        self.load_family_data()

    def load_family_data(self):
        try:
            self.patient_id = get_patient_id()
            self.people = fetch_people(self.patient_id)
        except Exception:
            self.status.config(
                text=(
                    "Unable to load family memories. "
                    "Please check your login and connection."
                )
            )
            return

        if len(self.people) < DIFFICULTY_PAIRS["easy"]:
            self.status.config(
                text=(
                    "More family memories are needed to play. "
                    "Please ask your caregiver to add at least "
                    "3 family members with photos and memories."
                )
            )
            return

        self.start_round()

    def start_round(self):
        if len(self.people) < DIFFICULTY_PAIRS[self.difficulty]:
            self.status.config(
                text="Not enough family memories for this level."
            )
            return

        try:
            new_game = FamilyMemoryMatchingGame(
                self.people,
                difficulty=self.difficulty,
            )
        except (ValueError, KeyError):
            self.status.config(
                text="Unable to prepare this memory round."
            )
            return

        self.game = new_game
        self.round_number += 1
        self.buttons = {}
        self.photo_images = {}
        self.waiting = False

        for widget in self.board.winfo_children():
            widget.destroy()

        rows, cols = GRID_SIZES[self.difficulty]

        for row in range(rows):
            self.board.grid_rowconfigure(row, weight=1)

        for col in range(cols):
            self.board.grid_columnconfigure(col, weight=1)

        self.level_label.config(
            text=(
                f"Round {self.round_number} | "
                f"Difficulty: {self.difficulty.upper()} | "
                f"{rows} x {cols} Grid"
            )
        )

        self.status.config(text="Choose your first card")
        self.next_button.config(state="disabled")

        for index, card in enumerate(self.game.cards):
            button = tk.Button(
                self.board,
                text="?",
                font=("Arial", 16, "bold"),
                bg="#7555B5",
                fg="white",
                activebackground="#A18BD1",
                wraplength=170,
                justify="center",
                relief="flat",
                cursor="hand2",
                compound="center",
                command=lambda cid=card.card_id: self.flip(cid),
            )

            button.grid(
                row=index // cols,
                column=index % cols,
                sticky="nsew",
                padx=7,
                pady=7,
            )

            self.buttons[card.card_id] = button

            if card.card_type == "photo":
                image_path = Path(card.content)

                try:
                    with Image.open(image_path) as image:
                        image = image.convert("RGB")
                        image.thumbnail((170, 125))
                        self.photo_images[card.card_id] = (
                            ImageTk.PhotoImage(image)
                        )
                except (OSError, ValueError):
                    self.status.config(
                        text="A family photo could not be loaded."
                    )
                    self.next_button.config(state="disabled")
                    for item in self.buttons.values():
                        item.config(state="disabled")
                    return

        self.refresh_board()

    def flip(self, card_id):
        if (
            self.waiting
            or self.game is None
            or self.game.is_complete()
        ):
            return

        result = self.game.flip_card(card_id)
        self.refresh_board()

        if result["status"] == "first_flip":
            self.status.config(text="Choose one more card")

        elif result["status"] == "match":
            self.status.config(
                text="Wonderful! You found a matching memory!"
            )
            self.waiting = True
            self.root.after(800, self.finish_turn)

        elif result["status"] == "mismatch":
            self.status.config(
                text="Take your time. Remember these cards."
            )
            self.waiting = True
            self.root.after(1600, self.finish_turn)

    def finish_turn(self):
        self.game.finish_turn()
        self.waiting = False
        self.refresh_board()

        if self.game.is_complete():
            self.complete_round()
        else:
            self.status.config(text="Choose your next pair")

    def complete_round(self):
        performance = self.game.get_performance()
        accuracy = performance["accuracy"]
        starting_difficulty = self.difficulty

        current_index = LEVELS.index(self.difficulty)

        if accuracy >= 80 and current_index < 2:
            candidate = LEVELS[current_index + 1]
            if len(self.people) >= DIFFICULTY_PAIRS[candidate]:
                next_difficulty = candidate
            else:
                next_difficulty = self.difficulty
        elif accuracy < 50 and current_index > 0:
            next_difficulty = LEVELS[current_index - 1]
        else:
            next_difficulty = self.difficulty

        try:
            save_game_session(
                self.patient_id,
                performance,
                starting_difficulty,
                next_difficulty,
            )
            save_message = "Progress saved."
        except Exception:
            save_message = (
                "Progress could not be saved. "
                "Please check your connection."
            )

        self.status.config(
            text=(
                f"Round complete! Accuracy: {accuracy}% | "
                f"Next level: {next_difficulty.upper()} | "
                f"{save_message}"
            )
        )

        self.difficulty = next_difficulty
        self.next_button.config(state="normal")

    def start_next_round(self):
        if self.game is None or not self.game.is_complete():
            return

        self.start_round()

    def refresh_board(self):
        if self.game is None:
            return

        for card in self.game.cards:
            button = self.buttons[card.card_id]

            if not card.face_up:
                button.config(
                    text="?",
                    image="",
                    bg="#7555B5",
                    fg="white",
                    state="normal",
                )
                continue

            background = (
                "#B5E3C0" if card.matched else "#FFF0B8"
            )

            if card.card_type == "photo":
                button.config(
                    text="",
                    image=self.photo_images[card.card_id],
                    bg=background,
                    state=(
                        "disabled" if card.matched
                        else "normal"
                    ),
                )
            else:
                button.config(
                    text=card.content,
                    image="",
                    bg=background,
                    fg="#43306B",
                    state=(
                        "disabled" if card.matched
                        else "normal"
                    ),
                )


if __name__ == "__main__":
    root = tk.Tk()
    MemoryMatchingBackend(root)
    root.mainloop()