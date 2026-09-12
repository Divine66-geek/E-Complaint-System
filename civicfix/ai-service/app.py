import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

from nlp.classifier import ComplaintClassifier
from nlp.duplication import find_duplicate
from nlp.image_model import analyze_image_content

app = Flask(__name__)
CORS(app)

print("Training classification model...")
classifier = ComplaintClassifier()
print("Model ready.")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/classify", methods=["POST"])
def classify():
    body = request.get_json(force=True) or {}
    text = (body.get("text") or "").strip()
    language = (body.get("language") or "en").strip().lower()
    if not text:
        return jsonify({"error": "text is required"}), 400

    result = classifier.classify(text, language)
    return jsonify(result)


@app.route("/check-duplicate", methods=["POST"])
def check_duplicate():
    body = request.get_json(force=True) or {}
    text = (body.get("text") or "").strip()
    candidates = body.get("candidates") or []
    if not text:
        return jsonify({"error": "text is required"}), 400

    match = find_duplicate(text, candidates)
    return jsonify(match or {"duplicate_of": None, "similarity": None})


@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    body = request.get_json(force=True) or {}
    image_data = body.get("image_data_url") or body.get("image") or ""
    description = (body.get("description") or "").strip()
    if not image_data:
        return jsonify({"error": "image is required"}), 400

    result = analyze_image_content(image_data, description)
    return jsonify({
        **result,
        "report_text": result.get("generated_issue", result.get("summary", "")) + (f" Keywords: {', '.join(result.get('keywords', []))}" if result.get('keywords') else ""),
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"AI service running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
