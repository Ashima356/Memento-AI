import requests

API_URL = "http://localhost:5000/api/games/data"


def test_backend_connection():
    try:
        response = requests.get(API_URL, timeout=10)

        print("Status code:", response.status_code)
        response.raise_for_status()

        data = response.json()

        print("Total people:", data.get("count", 0))
        print("\nPeople received from backend:")

        for person in data.get("people", []):
            print("Name:", person.get("name"))
            print("Relationship:", person.get("relationship"))
            print("Profile image:", person.get("profileImage"))
            print("Memories:", len(person.get("memories", [])))
            print("-" * 30)

    except requests.RequestException as error:
        print("Backend connection failed:", error)

    except ValueError:
        print("Backend did not return valid JSON.")


if __name__ == "__main__":
    test_backend_connection()