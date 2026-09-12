import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

export async function classify(text, language = "en") {
  const { data } = await axios.post(`${AI_SERVICE_URL}/classify`, { text, language });
  return data;
}

export async function analyzeImage(image, description = "") {
  if (!image || !image.dataUrl) return null;
  const { data } = await axios.post(`${AI_SERVICE_URL}/analyze-image`, {
    image_data_url: image.dataUrl,
    description,
  });
  return data;
}

export async function checkDuplicate(text, candidates) {
  const { data } = await axios.post(`${AI_SERVICE_URL}/check-duplicate`, {
    text,
    candidates,
  });
  return data;
}
