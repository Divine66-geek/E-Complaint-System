import os
import spacy

_MODEL_NAME = os.environ.get("SPACY_MODEL", "en_core_web_md")

try:
    nlp = spacy.load(_MODEL_NAME)
except OSError as exc:
    raise RuntimeError(
        f"spaCy model '{_MODEL_NAME}' is not installed. Run:\n"
        f"  python -m spacy download {_MODEL_NAME}"
    ) from exc


def get_doc(text: str):
    """Parse text once and reuse the spaCy Doc across classification + duplication."""
    return nlp(text)


def clean_lemmas(doc) -> str:
    """Lowercased, lemmatized, stopword/punct-stripped text — used as classifier input."""
    tokens = [
        tok.lemma_.lower()
        for tok in doc
        if not tok.is_stop and not tok.is_punct and not tok.is_space
    ]
    return " ".join(tokens)


def guess_area(doc) -> str:
    """Best-effort location guess from named entities (GPE/LOC/FAC)."""
    for ent in doc.ents:
        if ent.label_ in ("GPE", "LOC", "FAC"):
            return ent.text
    return "Not specified"


def urgency_hits(text: str, keyword_map: dict) -> dict:
    """Count how many urgency keywords from each bucket appear in the text."""
    lowered = text.lower()
    return {
        bucket: sum(1 for kw in keywords if kw in lowered)
        for bucket, keywords in keyword_map.items()
    }
