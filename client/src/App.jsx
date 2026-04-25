import { useRef, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
    } catch (err) {
      console.log("Camera error:", err);
      setResult("Camera not allowed");
    }
  };

  // Send image to backend
  const sendToBackend = async (blob) => {
    try {
      setLoading(true);
      setResult("");

      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const res = await axios.post(
        "https://deepfake-ai-project.onrender.com/api/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Backend response:", res.data);

      setResult(res.data?.prediction || "No response from server");
    } catch (err) {
      console.log("API error:", err);
      setResult("Error connecting to backend");
    } finally {
      setLoading(false);
    }
  };

  // Capture from camera
  const captureAndDetect = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = 224;
    canvas.height = 224;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 224, 224);

    canvas.toBlob((blob) => {
      if (blob) sendToBackend(blob);
    }, "image/jpeg");
  };

  // Upload from gallery
  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (file) {
      sendToBackend(file);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>Deepfake Detector</h1>

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "300px", border: "1px solid black" }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ marginTop: "10px" }}>
        <button onClick={startCamera}>Start Camera</button>
        <button onClick={captureAndDetect}>Capture & Detect</button>
      </div>

      <div style={{ marginTop: "10px" }}>
        <input type="file" accept="image/*" onChange={uploadImage} />
      </div>

      <h2>
        {loading ? "Processing..." : `Result: ${result}`}
      </h2>
    </div>
  );
}

export default App;