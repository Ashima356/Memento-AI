from insightface.app import FaceAnalysis

print("Loading Memento AI face model...")

app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

app.prepare(ctx_id=-1)

print("Memento AI Face Model Loaded Successfully!")