require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const app = express();

app.use(cors({ origin: "*" }));

const upload = multer({ dest: "uploads/" });

app.post("/api/predict", upload.single("file"), async (req, res) => {
  try {
    const form = new FormData();

    form.append(
      "file",
      fs.createReadStream(req.file.path)
    );

    const response = await axios.post(
      process.env.AI_API_URL,
      form,
      {
        headers: {
          ...form.getHeaders()
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.log(err);
    res.json({ prediction: "Error", confidence: "0%" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});