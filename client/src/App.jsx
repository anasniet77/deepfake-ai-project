import { useState, useRef } from "react";
import axios from "axios";
import heroImg from "./assets/hero.png";
import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [result, setResult] = useState("");
  const [count, setCount] = useState(0);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
  };

  const capture = async () => {
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

  return (
    <>
      <div>
        <h1>Deepfake Detector</h1>

        <video ref={videoRef} autoPlay />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <button onClick={startCamera}>Start Camera</button>
        <button onClick={capture}>Detect</button>

        <h2>{result}</h2>
      </div>

      <hr />

      <section>
        <img src={heroImg} width="170" height="179" alt="" />
        <img src={reactLogo} alt="React logo" />
        <img src={viteLogo} alt="Vite logo" />

        <h1>Get started</h1>

        <button onClick={() => setCount((c) => c + 1)}>
          Count is {count}
        </button>
      </section>
    </>
  );
}

export default App;