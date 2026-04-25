import { useRef, useState } from "react";
import axios from "axios";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [result, setResult] = useState("");

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const captureAndDetect = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = 224;
    canvas.height = 224;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 224, 224);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const res = await axios.post(
        "https://deepfake-ai-project.onrender.com/api/predict",
        formData
      );

      setResult(res.data.prediction);
    });
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      "https://deepfake-ai-project.onrender.com/api/predict",
      formData
    );

    setResult(res.data.prediction);
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Deepfake Detector</h1>

      <video ref={videoRef} autoPlay style={{ width: "300px" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ marginTop: "10px" }}>
        <button onClick={startCamera}>Start Camera</button>
        <button onClick={captureAndDetect}>Capture & Detect</button>
      </div>

      <div style={{ marginTop: "10px" }}>
        <input type="file" accept="image/*" onChange={uploadImage} />
      </div>

      <h2>Result: {result}</h2>
    </div>
  );
}

export default App;