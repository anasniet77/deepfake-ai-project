require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

const app = express();

// ✅ PASTE YOUR VERCEL FRONTEND URL HERE (and localhost for dev)
const ALLOWED_ORIGINS = [
  "https://deepfake-ai-project-q2zw.vercel.app",  // ← your exact Vercel URL
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// ✅ Create uploads/ folder if it doesn't exist (Render ephemeral filesystem)
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads/ directory");
}

// Store file temporarily in uploads/
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* ── HEALTH CHECK ─────────────────────────────────────────── */
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

/* ── PREDICT ROUTE ────────────────────────────────────────── */
app.post("/api/predict", upload.single("file"), async (req, res) => {
  // ✅ Validate AI_API_URL is set
  if (!process.env.AI_API_URL) {
    console.error("AI_API_URL environment variable is not set");
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "AI_API_URL is not configured. Set it in Render → Environment.",
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const tempFilePath = req.file.path;

  try {
    // Forward image to FastAPI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(tempFilePath), {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    // ✅ AI_API_URL should be: https://your-fastapi-host.com/predict
    const response = await axios.post(process.env.AI_API_URL, formData, {
      headers: formData.getHeaders(),
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    res.json(response.data);
  } catch (err) {
    console.error("FastAPI error:", err.message);

    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      res.status(502).json({
        prediction: "Error",
        confidence: "0%",
        message: "Could not reach the AI model server. Check AI_API_URL.",
      });
    } else if (err.response) {
      // FastAPI returned an error response
      res.status(err.response.status).json({
        prediction: "Error",
        confidence: "0%",
        message: err.response.data?.detail || err.message,
      });
    } else {
      res.status(500).json({
        prediction: "Error",
        confidence: "0%",
        message: err.message,
      });
    }
  } finally {
    // ✅ Always clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (e) => {
        if (e) console.error("Failed to delete temp file:", e.message);
      });
    }
  }
});

/* ── 404 HANDLER ──────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/* ── GLOBAL ERROR HANDLER ─────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message });
});

/* ── START SERVER ─────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI_API_URL: ${process.env.AI_API_URL || "⚠️ NOT SET"}`);
});
// Wake up FastAPI on startup
const wakeUpAI = async () => {
  try {
    const res = await axios.get(process.env.AI_API_URL.replace("/predict", "/"));
    console.log("AI API is awake:", res.data);
  } catch (err) {
    console.log("AI API wake-up ping failed:", err.message);
  }
};
wakeUpAI();