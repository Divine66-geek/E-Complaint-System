import { useEffect, useRef, useState } from "react";

const SPEECH_LOCALES = {
  af: "af-ZA", en: "en-ZA", nr: "nr-ZA", nso: "nso-ZA", st: "st-ZA",
  ss: "ss-ZA", tn: "tn-ZA", ts: "ts-ZA", ve: "ve-ZA", xh: "xh-ZA", zu: "zu-ZA",
};

const LANGUAGES = [
  ["en", "English"], ["af", "Afrikaans"], ["nr", "isiNdebele"], ["nso", "Sepedi"],
  ["st", "Sesotho"], ["ss", "siSwati"], ["tn", "Setswana"], ["ts", "Xitsonga"],
  ["ve", "Tshivenda"], ["xh", "isiXhosa"], ["zu", "isiZulu"],
];

export default function ComplaintForm({ onSubmit, onImageAnalyze, submitting }) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [locationOn, setLocationOn] = useState(false);
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechStatus, setSpeechStatus] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [imageSummary, setImageSummary] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  async function analyzeSelectedImage(image) {
    if (!image || !onImageAnalyze) return;
    const result = await onImageAnalyze(image, text || "");
    if (!result) return;
    const nextText = result.report_text || result.summary || result.issue_text || "";
    const isImagePayload = typeof nextText === "string" && /^data:image\//i.test(nextText.trim());
    if (nextText && !isImagePayload) {
      setText(nextText);
      setImageSummary(result.keywords?.length ? `Keywords: ${result.keywords.join(", ")}` : result.summary || result.issue_text || "");
    }
  }

  function handleSubmit() {
    if (!text.trim() && !attachedImage) return;
    recognitionRef.current?.stop();
    onSubmit(text.trim(), locationOn ? area.trim() : "", language, coordinates, attachedImage);
    setText("");
    setAttachedImage(null);
    setImageSummary("");
  }

  function handleImagePick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = {
        name: file.name,
        type: file.type || "image/jpeg",
        dataUrl: reader.result,
      };
      setAttachedImage(image);
      analyzeSelectedImage(image);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = {
        name: file.name,
        type: file.type || "image/jpeg",
        dataUrl: reader.result,
      };
      setAttachedImage(image);
      analyzeSelectedImage(image);
    };
    reader.readAsDataURL(file);
  }

  function appendTranscript(transcript) {
    setText((current) => {
      const separator = current.trim() ? " " : "";
      return `${current}${separator}${transcript.trim()}`.slice(0, 800);
    });
  }

  function toggleVoiceInput() {
    if (isListening) {
      setSpeechStatus("Recording stopped. Review or edit the transcript before sending.");
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus("Voice input is not supported in this browser. Try the latest Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LOCALES[language] || "en-ZA";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsListening(true);
      setSpeechStatus("Listening… Speak your report, then select Stop recording.");
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      if (finalTranscript) appendTranscript(finalTranscript);
      setInterimTranscript(interim.trim());
    };
    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone permission was denied. Allow microphone access and try again.",
        "no-speech": "No speech was detected. Try speaking again.",
        "audio-capture": "No microphone was found. Check that a microphone is connected.",
      };
      setSpeechStatus(messages[event.error] || "Voice input stopped unexpectedly. Please try again.");
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleLocation() {
    if (locationOn) {
      setLocationOn(false);
      setCoordinates(null);
      setLocationStatus("");
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("Location is not available in this browser.");
      return;
    }

    setLocationStatus("Waiting for your permission...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          accuracy: Math.round(coords.accuracy),
        });
        setLocationOn(true);
        setLocationStatus("Location attached with your permission.");
      },
      ({ code }) => {
        setCoordinates(null);
        setLocationOn(false);
        setLocationStatus(code === 1 ? "Location permission was declined." : "We could not determine your location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  const locationLink = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : "";

  return (
    <div className="surface complaint-form">
      <div className="form-heading"><div><div className="eyebrow">New report</div><h3>What needs attention?</h3></div><span className="form-status"><i /> Private by default</span></div>

      <div className="report-label-row">
        <label className="input-label" htmlFor="complaint-text">Your report</label>
        <label className="language-picker">Report language
          <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={isListening}>
            {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </div>
      <textarea
        id="complaint-text"
        className="report-textarea"
        placeholder="For example: There has been no water in Kanyamazane since yesterday morning, and elderly residents are struggling."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={800}
        aria-describedby="report-help voice-status"
      />
      <div className="textarea-footer"><span id="report-help">Specific details help the right team respond.</span><span className={text.length > 700 ? "counter-warn" : ""}>{text.length}/800</span></div>

      <div className="report-tools-row">
        <div className="voice-input-row">
          <button type="button" onClick={toggleVoiceInput} className={`voice-input-button ${isListening ? "voice-input-active" : ""}`} aria-pressed={isListening}>
            <span className="voice-input-icon" aria-hidden="true">{isListening ? "■" : "🎙"}</span>
            <span>{isListening ? "Stop recording" : "Speak your report"}</span>
          </button>
          <span id="voice-status" className="voice-input-status" role="status">
            {speechStatus || "Use your microphone to add speech to the report."}
            {interimTranscript && <em> “{interimTranscript}”</em>}
          </span>
        </div>
        <div className="location-control">
          <button type="button" onClick={toggleLocation} className={`location-toggle ${locationOn ? "location-toggle-on" : ""}`}>
            <span className="location-icon" aria-hidden="true">⌖</span>
            <span>{locationOn ? "Location selected" : "Use my location"}</span>
          </button>
          {locationOn && locationLink && <a href={locationLink} target="_blank" rel="noreferrer" className="location-link">Open in Maps</a>}
          {locationOn && <input type="text" className="location-input" placeholder="Street, suburb or ward (optional)" value={area} onChange={(e) => setArea(e.target.value)} />}
        </div>
      </div>

      <div
        className={`photo-dropzone ${dragActive ? "photo-dropzone-active" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="photo-dropzone-icon" aria-hidden="true">+</div>
        <div className="photo-dropzone-copy">
          <strong>Drop a photo here</strong>
          <span>AI will identify what is happening and prepare the report.</span>
        </div>
        <label className="photo-browse-button" htmlFor="complaint-image">Browse image</label>
        <input id="complaint-image" className="photo-file-input" type="file" accept="image/*" onChange={handleImagePick} />
      </div>
      {imageSummary && <div className="image-summary" role="status">{imageSummary}</div>}

      {locationStatus && <div className="location-permission-status" role="status">{locationStatus}</div>}

      <div className="form-submit-row">
        <span className="form-footnote"><span aria-hidden="true">✦</span> E-Complaint System will study the image and suggest a department and priority.</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || (!text.trim() && !attachedImage)}
          className="primary-action"
        >
          {submitting ? "Analysing..." : "Send report"}
        </button>
      </div>
    </div>
  );
}
