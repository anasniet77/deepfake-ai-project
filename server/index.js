require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");

const app = express();
app.use(cors({
  origin: "*"
}));

const upload = multer({ dest: "uploads/" });

app.post("/api/predict", upload.single("file"), async (req, res) => {
  try {
    const response = await axios.post(
      process.env.AI_API_URL,
      { filePath: req.file.path }
    );

    res.json(response.data);
  } catch (err) {
    res.json({ prediction: "Error", confidence: "0%" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});