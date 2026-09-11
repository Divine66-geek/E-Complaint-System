import { useState } from "react";

export default function ComplaintForm({ onSubmit, submitting }) {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("en");
  const [locationOn, setLocationOn] = useState(false);
  const [area, setArea] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit(text.trim(), locationOn ? area.trim() : "", language, coordinates);
    setText("");
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

  const suggestions = ["Streetlight out on my block", "Water has stopped in our area", "Overflowing rubbish collection"];

  return (
    <div className="surface complaint-form">
      <div className="form-heading"><div><div className="eyebrow">New report</div><h3>What needs attention?</h3></div><span className="form-status"><i /> Private by default</span></div>
      <p className="form-copy">Give us the useful details: what happened, where it is, and who is affected.</p>

      <label className="input-label" htmlFor="complaint-text">Your report</label>
      <textarea
        id="complaint-text"
        className="report-textarea"
        placeholder="For example: There has been no water in Kanyamazane since yesterday morning, and elderly residents are struggling."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={800}
      />
      <div className="textarea-footer"><span>Specific details help the right team respond.</span><span className={text.length > 700 ? "counter-warn" : ""}>{text.length}/800</span></div>

      <div className="suggestions"><span>Try a starting point</span>{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setText(suggestion)}>{suggestion}</button>)}</div>

      <div className="location-row">
        <button
          type="button"
          onClick={toggleLocation}
          className={`location-toggle ${
            locationOn
              ? "location-toggle-on"
              : ""
          }`}
        >
          <span aria-hidden="true">⌖</span> {locationOn ? "Location attached" : "Use my location"}
        </button>
        {locationOn && (
          <input
            type="text"
            className="location-input"
            placeholder="Street, suburb or ward (optional)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        )}
      </div>
      {locationStatus && <div className="location-permission-status" role="status">{locationStatus}</div>}

      <div className="form-submit-row">
        <span className="form-footnote"><span aria-hidden="true">✦</span> E-Complaint System will suggest a department and check for similar reports.</span>
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="primary-action"
        >
          {submitting ? "Analysing..." : "Send report"}
        </button>
      </div>
    </div>
  );
}
