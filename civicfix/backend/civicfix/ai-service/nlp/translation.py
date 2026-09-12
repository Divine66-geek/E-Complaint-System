from functools import lru_cache

from deep_translator import GoogleTranslator

SUPPORTED_LANGUAGES = {
    "af", "en", "nr", "nso", "st", "ss", "tn", "ts", "ve", "xh", "zu",
}


@lru_cache(maxsize=256)
def _translate(text: str, language: str) -> str:
    return GoogleTranslator(source=language, target="en").translate(text)


def translate_to_english(text: str, language: str) -> tuple[str, bool]:
    """Translate supported local-language text for English-only NLP models.

    The original report is retained by the API. If translation is unavailable,
    classification still runs on the submitted text instead of rejecting it.
    """
    if language == "en" or language not in SUPPORTED_LANGUAGES:
        return text, False

    try:
        translated = _translate(text, language)
    except Exception:
        return text, False

    return translated or text, bool(translated)