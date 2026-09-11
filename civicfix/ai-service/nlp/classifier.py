import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import tensorflow as tf

from .preprocessing import get_doc, clean_lemmas, guess_area, urgency_hits
from .training_data import EXAMPLES
from .departments import CATEGORIES, DEPARTMENT_MAP, URGENCY_KEYWORDS
from .translation import translate_to_english

_MAX_FEATURES = 300


class ComplaintClassifier:
    """Small TF-IDF + feedforward neural net trained once at startup.

    This is intentionally lightweight so the service boots in a couple of
    seconds on a laptop. Swap `training_data.EXAMPLES` for a real, larger
    labelled dataset and this will scale straightforwardly — the model
    architecture and training loop don't need to change.
    """

    def __init__(self):
        texts, labels = zip(*EXAMPLES)
        cleaned = [clean_lemmas(get_doc(t)) for t in texts]

        self.vectorizer = TfidfVectorizer(max_features=_MAX_FEATURES)
        X = self.vectorizer.fit_transform(cleaned).toarray().astype("float32")

        self.label_to_idx = {c: i for i, c in enumerate(CATEGORIES)}
        y = np.array([self.label_to_idx[l] for l in labels])
        y_onehot = tf.keras.utils.to_categorical(y, num_classes=len(CATEGORIES))

        self.model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(X.shape[1],)),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation="relu"),
            tf.keras.layers.Dense(len(CATEGORIES), activation="softmax"),
        ])
        self.model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
        self.model.fit(X, y_onehot, epochs=60, verbose=0)

    def classify(self, text: str, language: str = "en") -> dict:
        translated_text, translated = translate_to_english(text, language)
        doc = get_doc(translated_text)
        cleaned = clean_lemmas(doc)
        vec = self.vectorizer.transform([cleaned]).toarray().astype("float32")
        probs = self.model.predict(vec, verbose=0)[0]

        top_idx = int(np.argmax(probs))
        category = CATEGORIES[top_idx]
        confidence = round(float(probs[top_idx]) * 100)

        area = guess_area(doc)
        priority, reason = assign_priority(translated_text, category)

        return {
            "category": category,
            "confidence": confidence,
            "area": area,
            "department": DEPARTMENT_MAP[category],
            "priority": priority,
            "priority_reason": reason,
            "language": language,
            "translated": translated,
        }


def assign_priority(text: str, category: str) -> tuple[str, str]:
    hits = urgency_hits(text, URGENCY_KEYWORDS)

    if hits["urgent"] > 0:
        return "Urgent", "The report mentions language associated with an immediate safety or health risk."

    if category in ("Sanitation", "Water") and hits["high"] > 0:
        return "Urgent", "A water or sanitation outage combined with vulnerable-resident impact is treated as urgent."

    if hits["high"] > 0:
        return "High", "The report indicates extended duration or impact on a vulnerable group."

    if category in ("Sanitation",):
        return "High", "Sanitation issues carry a public health risk by default."

    if hits["low"] > 0:
        return "Low", "The report describes a small, isolated issue."

    return "Medium", "No urgent risk or extended-impact language was detected; treated as routine."
