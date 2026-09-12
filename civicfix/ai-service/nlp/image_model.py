from __future__ import annotations

import base64
import re
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    Image = None

COMMON_CATEGORIES = {
    "accident": "Traffic Accident",
    "collision": "Traffic Accident",
    "crash": "Traffic Accident",
    "wreck": "Traffic Accident",
    "vehicle": "Traffic Accident",
    "pothole": "Roads",
    "road": "Roads",
    "crack": "Roads",
    "burst": "Water",
    "pipe": "Water",
    "water": "Water",
    "flood": "Water",
    "leak": "Water",
    "leaking": "Water",
    "sewer": "Sanitation",
    "sewage": "Sanitation",
    "garbage": "Waste",
    "trash": "Waste",
    "dump": "Waste",
    "power": "Electricity",
    "light": "Street Lighting",
    "streetlight": "Street Lighting",
    "electric": "Electricity",
    "broken": "Infrastructure",
    "drain": "Drainage",
}


SCENE_PATTERNS = [
    {
        "triggers": ["car accident", "traffic accident", "vehicle collision", "car crash", "wrecked car", "accident on the road"],
        "category": "Traffic Accident",
        "issue_text": "Traffic accident reported on the road.",
        "priority": "Urgent",
        "keywords": ["traffic", "accident", "vehicle", "road", "crash"],
    },
    {
        "triggers": ["burst pipe", "pipe burst", "water main break", "broken water pipe", "bursted pipe", "water is spraying", "pipe leaking badly"],
        "category": "Water",
        "issue_text": "Burst pipe reported causing water escaping onto the road or property.",
        "priority": "Urgent",
        "keywords": ["burst", "pipe", "water", "leak", "road"],
    },
    {
        "triggers": ["flooding", "water flooding", "road flooded", "standing water"],
        "category": "Water",
        "issue_text": "Flooding or standing water reported in the area.",
        "priority": "Urgent",
        "keywords": ["flood", "water", "road", "standing"],
    },
    {
        "triggers": ["pothole", "road damage", "cracked road", "broken road surface"],
        "category": "Roads",
        "issue_text": "Road damage reported, including a pothole or deteriorated surface.",
        "priority": "High",
        "keywords": ["pothole", "road", "crack", "surface"],
    },
    {
        "triggers": ["overflowing garbage", "garbage pile", "trash dump", "illegal dump site"],
        "category": "Waste",
        "issue_text": "Waste accumulation reported and needs cleaning.",
        "priority": "Medium",
        "keywords": ["garbage", "trash", "dump", "waste"],
    },
]

VISION_LABELS = [
    "a traffic accident with crashed or damaged vehicles",
    "a burst water pipe spraying water",
    "flooding on a road or in a public area",
    "a pothole or damaged road surface",
    "an overflowing garbage dump",
    "a broken streetlight or electrical hazard",
    "a normal road with no visible civic problem",
]

VISION_RESULTS = {
    VISION_LABELS[0]: {
        "category": "Traffic Accident",
        "issue_text": "Traffic accident detected: damaged vehicles and an active road incident are visible.",
        "priority": "Urgent",
        "keywords": ["traffic accident", "damaged vehicle", "road incident", "emergency"],
    },
    VISION_LABELS[1]: {
        "category": "Water",
        "issue_text": "Burst water pipe detected: water appears to be escaping onto a road or public property.",
        "priority": "Urgent",
        "keywords": ["burst pipe", "water leak", "road hazard", "water damage"],
    },
    VISION_LABELS[2]: {
        "category": "Water",
        "issue_text": "Flooding detected in a public area, creating a possible access and safety hazard.",
        "priority": "Urgent",
        "keywords": ["flooding", "standing water", "public road", "safety hazard"],
    },
    VISION_LABELS[3]: {
        "category": "Roads",
        "issue_text": "Damaged road surface or pothole detected and requiring road maintenance.",
        "priority": "High",
        "keywords": ["pothole", "road damage", "road surface", "maintenance"],
    },
    VISION_LABELS[4]: {
        "category": "Waste",
        "issue_text": "Overflowing waste or an illegal dumping site detected and requiring cleanup.",
        "priority": "High",
        "keywords": ["garbage", "illegal dumping", "waste", "cleanup"],
    },
    VISION_LABELS[5]: {
        "category": "Electricity",
        "issue_text": "Possible electrical or street-lighting hazard detected in the image.",
        "priority": "Urgent",
        "keywords": ["electrical hazard", "streetlight", "power", "safety"],
    },
}

_vision_classifier = None


def _get_vision_classifier():
    global _vision_classifier
    if _vision_classifier is None:
        from transformers import pipeline
        _vision_classifier = pipeline(
            "zero-shot-image-classification",
            model="openai/clip-vit-base-patch32",
            framework="pt",
        )
    return _vision_classifier


def _decode_image(data_url: str):
    if Image is None or not isinstance(data_url, str) or "," not in data_url:
        return None
    try:
        encoded = data_url.split(",", 1)[1]
        return Image.open(BytesIO(base64.b64decode(encoded))).convert("RGB")
    except (ValueError, OSError, base64.binascii.Error):
        return None


def _vision_result(image) -> dict | None:
    if image is None:
        return None
    try:
        predictions = _get_vision_classifier()(image, candidate_labels=VISION_LABELS)
    except Exception:
        return None
    if not predictions:
        return None
    best = predictions[0]
    detected = VISION_RESULTS.get(best["label"])
    if not detected or best["label"] == VISION_LABELS[-1]:
        return None
    confidence = round(float(best["score"]) * 100)
    return {
        **detected,
        "ocr_text": " ".join(detected["keywords"]),
        "summary": f"The image was analyzed as a {detected['category'].lower()} scene. {detected['issue_text']}",
        "generated_issue": detected["issue_text"],
        "confidence": confidence,
        "source": "vision_model",
    }


def infer_issue_from_image(image_hint: str | None) -> dict:
    text = (image_hint or "").strip().lower()
    if not text:
        return {
            "category": "Other",
            "issue_text": "The image could not be interpreted as a specific civic problem.",
            "ocr_text": "",
            "keywords": [],
            "summary": "No specific civic issue could be identified from the image.",
            "generated_issue": "Please add a short description of what is happening in the image so the correct team can be assigned.",
            "priority": "Medium",
            "confidence": 0,
        }

    for pattern in SCENE_PATTERNS:
        if any(trigger in text for trigger in pattern["triggers"]):
            keywords = pattern["keywords"]
            issue_text = pattern["issue_text"]
            category = pattern["category"]
            priority = pattern["priority"]
            summary = f"Image suggests a {category.lower()} issue: {issue_text}"
            return {
                "category": category,
                "issue_text": issue_text,
                "ocr_text": " ".join(keywords),
                "keywords": keywords,
                "summary": summary,
                "generated_issue": issue_text,
                "priority": priority,
                "confidence": 90,
            }

    category = "Other"
    for keyword, mapped_category in COMMON_CATEGORIES.items():
        if keyword in text:
            category = mapped_category
            break

    issue_text = text
    if not issue_text:
        issue_text = "Civic maintenance issue observed in the image."
    issue_text = re.sub(r"\s+", " ", issue_text).strip()
    issue_text = issue_text[0].upper() + issue_text[1:]

    priority = "Medium"
    urgent_words = ["flood", "sewage", "fire", "electric", "power line", "collapse", "burst", "water leak", "accident", "collision", "crash"]
    high_words = ["blocked", "road", "dump", "pothole", "broken", "nonfunctional"]
    if any(word in text for word in urgent_words):
        priority = "Urgent"
    elif any(word in text for word in high_words):
        priority = "High"
    elif category in {"Waste", "Roads"}:
        priority = "Medium"
    elif category in {"Water", "Sanitation"}:
        priority = "High"

    keywords = []
    for token in re.findall(r"[a-zA-Z]+", issue_text):
        word = token.lower()
        if len(word) > 3 and word not in {"with", "from", "this", "that", "issue", "image", "suggests", "observed", "cause", "causing"}:
            keywords.append(word)
    keywords = keywords[:6]

    ocr_text = " ".join(keywords) if keywords else issue_text
    if category == "Roads" and "pothole" in text:
        generated_issue = "Pothole reported on the road surface."
    elif category == "Water" and ("flood" in text or "water" in text):
        generated_issue = "Water-related problem reported at the site."
    elif category == "Waste" and ("garbage" in text or "trash" in text):
        generated_issue = "Waste accumulation reported and needs cleanup."
    elif category == "Sanitation" and ("sewage" in text or "sewer" in text):
        generated_issue = "Sanitation risk reported due to sewer or waste overflow."
    elif category == "Street Lighting":
        generated_issue = "Street lighting issue reported in the area."
    elif category == "Electricity":
        generated_issue = "Electrical hazard or outage reported in the area."
    else:
        generated_issue = f"{category} issue detected from the uploaded image."

    return {
        "category": category,
        "issue_text": issue_text,
        "ocr_text": ocr_text,
        "keywords": keywords,
        "summary": f"Image suggests a {category.lower()} issue: {issue_text}.",
        "generated_issue": generated_issue,
        "priority": priority,
        "confidence": 78,
    }


def analyze_image_content(image_data_url: str, image_hint: str | None = None) -> dict:
    """Analyze image pixels first, using text hints only if vision is unavailable."""
    result = _vision_result(_decode_image(image_data_url))
    if result:
        return result
    result = infer_issue_from_image(image_hint)
    result["source"] = "text_fallback"
    return result
