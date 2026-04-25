import { useRef, useState, useEffect } from "react";
import axios from "axios";

// ✅ PASTE YOUR RENDER BACKEND URL HERE
const BACKEND_URL = "https://deepfake-ai-project.onrender.com";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [backendStatus, setBackendStatus] = useState("waking"); // "waking" | "ready"
  const [preview, setPreview] = useState(null);

  // Wake up Render backend on app load (free tier sleeps after inactivity)
 useEffect(() => {
  // Wake up Node backend
  axios.get(`${BACKEND_URL}/`).catch(() => {});
  // Wake up FastAPI directly
  axios.get(`https://deepfake-ai-api.onrender.com/`).catch(() => {});
}, []);

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setResult(null);
      setPreview(null);
    } catch (err) {
      console.error("Camera error:", err);
      setResult({ error: "Camera access denied or not available." });
    }
  };

  // Stop webcam and release stream
  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Send image blob to Node backend → FastAPI
  const sendToBackend = async (blob, previewUrl) => {
    setLoading(true);
    setResult(null);
    if (previewUrl) setPreview(previewUrl);

    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    try {
      const res = await axios.post(`${BACKEND_URL}/api/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000, // 90s — Render free tier can be slow on cold start
      });

      setResult({
        prediction: res.data?.prediction ?? "Unknown",
        confidence: res.data?.confidence ?? "N/A",
      });
    } catch (err) {
  console.error("API error:", err);
  if (err.response) {
    // Server responded with 500 — backend is UP but crashed
    setResult({
      error: `Server error (${err.response.status}): ${err.response.data?.message || "Check Render logs"}`,
    });
  } else if (err.code === "ECONNABORTED") {
    setResult({ error: "Request timed out. Backend may be sleeping." });
  } else {
    setResult({ error: `Network error: ${err.message}` });
  }
} finally {
      setLoading(false);
    }
  };

  // Capture frame from webcam
  const captureAndDetect = () => {
    if (!cameraActive) {
      setResult({ error: "Start the camera first." });
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 224;
    canvas.height = 224;
    canvas.getContext("2d").drawImage(video, 0, 0, 224, 224);
    const previewUrl = canvas.toDataURL("image/jpeg");
    canvas.toBlob((blob) => blob && sendToBackend(blob, previewUrl), "image/jpeg");
  };

  // Upload from file input
  const uploadImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    stopCamera();
    const previewUrl = URL.createObjectURL(file);
    sendToBackend(file, previewUrl);
    e.target.value = ""; // reset so same file can be re-uploaded
  };

  const isFake = result?.prediction === "Fake";
  const isReal = result?.prediction === "Real";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Deepfake Detector</h1>
        <p style={styles.subtitle}>Upload an image or use your camera to detect AI-generated faces.</p>

        {/* Backend status */}
        {backendStatus === "waking" && (
  <div style={styles.statusBanner}>
    ⏳ Waking up backend server... this takes ~30s on first load.
    <br />
    <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
      You can still upload — it will wait automatically.
    </span>
  </div>
)}

        {/* Video preview */}
        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ ...styles.video, display: cameraActive ? "block" : "none" }}
          />
          {preview && !cameraActive && (
            <img src={preview} alt="Preview" style={styles.video} />
          )}
          {!cameraActive && !preview && (
            <div style={styles.placeholder}>📷 Camera / Upload preview</div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Controls */}
        <div style={styles.controls}>
          {!cameraActive ? (
            <button style={styles.btnPrimary} onClick={startCamera}>
              Start Camera
            </button>
          ) : (
            <>
              <button style={styles.btnPrimary} onClick={captureAndDetect} disabled={loading}>
                {loading ? "Analysing…" : "Capture & Detect"}
              </button>
              <button style={styles.btnSecondary} onClick={stopCamera}>
                Stop Camera
              </button>
            </>
          )}

          <label style={styles.btnSecondary}>
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Result */}
        {loading && <div style={styles.resultBox}>🔍 Analysing image…</div>}

        {result && !loading && (
          <div
            style={{
              ...styles.resultBox,
              borderColor: result.error ? "#f59e0b" : isFake ? "#ef4444" : "#22c55e",
              background: result.error
                ? "#fef3c7"
                : isFake
                ? "#fee2e2"
                : "#dcfce7",
              color: result.error ? "#92400e" : isFake ? "#991b1b" : "#14532d",
            }}
          >
            {result.error ? (
              <span>⚠️ {result.error}</span>
            ) : (
              <>
                <span style={{ fontSize: "1.4rem" }}>
                  {isFake ? "🚨" : "✅"} {result.prediction}
                </span>
                <span style={{ fontSize: "0.9rem", marginTop: 4, display: "block" }}>
                  Confidence: {result.confidence}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px",
  },
  card: {
    background: "#1e293b",
    borderRadius: "16px",
    padding: "32px",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
    color: "#f1f5f9",
  },
  title: { margin: "0 0 8px", fontSize: "1.8rem", fontWeight: 700, color: "#f8fafc" },
  subtitle: { margin: "0 0 20px", fontSize: "0.9rem", color: "#94a3b8" },
  statusBanner: {
    background: "#1d4ed8",
    color: "#bfdbfe",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "0.85rem",
    marginBottom: "16px",
  },
  videoContainer: {
    width: "100%",
    aspectRatio: "4/3",
    background: "#0f172a",
    borderRadius: "10px",
    overflow: "hidden",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  placeholder: { color: "#475569", fontSize: "0.9rem" },
  controls: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  btnPrimary: {
    flex: 1,
    padding: "10px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "0.9rem",
    minWidth: "120px",
  },
  btnSecondary: {
    flex: 1,
    padding: "10px 16px",
    background: "#334155",
    color: "#cbd5e1",
    border: "1px solid #475569",
    borderRadius: "8px",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "0.9rem",
    minWidth: "120px",
    textAlign: "center",
  },
  resultBox: {
    borderRadius: "10px",
    padding: "16px",
    border: "2px solid",
    textAlign: "center",
    fontWeight: 600,
    transition: "all 0.3s",
  },
};

export default App;
