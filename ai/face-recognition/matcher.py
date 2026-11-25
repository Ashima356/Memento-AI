import numpy as np


def cosine_similarity(embedding1, embedding2):
    embedding1 = np.asarray(embedding1)
    embedding2 = np.asarray(embedding2)

    similarity = np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) *
        np.linalg.norm(embedding2)
    )

    return float(similarity)