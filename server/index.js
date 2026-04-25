require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const app = express();

app.use(cors({ origin: "*" }));

// store uploaded file temporarily
const upload = multer({ dest: "uploads/" });

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("Backend is running");
});

/* ---------------- PREDICT ROUTE ---------------- */
app.post("/api/predict", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // create form-data for FastAPI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(req.file.path));

    // call FastAPI backend
    const response = await axios.post(
      process.env.AI_API_URL,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000,
      }
    );

    // delete temp file after sending
    fs.unlinkSync(req.file.path);

    res.json(response.data);

  } catch (err) {
    console.log("ERROR:", err.message);

    res.status(500).json({
      prediction: "Error",
      confidence: "0%",
      message: err.message,
    });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});