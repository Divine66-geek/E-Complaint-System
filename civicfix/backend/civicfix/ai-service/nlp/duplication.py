import os
from .preprocessing import get_doc

_THRESHOLD = float(os.environ.get("DUPLICATE_SIMILARITY_THRESHOLD", "0.85"))


def find_duplicate(new_text: str, candidates: list[dict]) -> dict | None:
    """
    candidates: [{"id": "...", "text": "..."}, ...] — typically the open
    reports already in the same category, fetched by the backend.

    Returns {"duplicate_of": id, "similarity": 0-100} or None.
    """
    if not candidates:
        return None

    new_doc = get_doc(new_text)
    if not new_doc.has_vector or new_doc.vector_norm == 0:
        return None

    best_id, best_score = None, 0.0
    for c in candidates:
        cand_doc = get_doc(c["text"])
        if not cand_doc.has_vector or cand_doc.vector_norm == 0:
            continue
        score = new_doc.similarity(cand_doc)
        if score > best_score:
            best_score, best_id = score, c["id"]

    if best_id and best_score >= _THRESHOLD:
        return {"duplicate_of": best_id, "similarity": round(best_score * 100)}
    return None
