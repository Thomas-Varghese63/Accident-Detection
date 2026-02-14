import express from "express";
import multer from "multer";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.static("."));

app.post("/detect", upload.single("image"), async (req, res) => {
  try {
    const image = fs.readFileSync(req.file.path, {
      encoding: "base64",
    });

    const response = await axios({
      method: "POST",
      url: "https://detect.roboflow.com/accident-and-non-accident-label-image-dataset-mkbvw/1",
      params: {
        api_key: process.env.ROBOFLOW_API_KEY,
        confidence: 95,
      },
      data: image,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const predictions = response.data.predictions;

    const result = {
      accidentDetected: predictions.length > 0,
      predictions,
    };

    console.log("Response from Roboflow:");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("\nResult sent to frontend:");
    console.log(JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.log("Error detected:");
    console.log(JSON.stringify({ 
      message: error.message, 
      status: error.response?.status,
      data: error.response?.data
    }, null, 2));
    res.status(500).send("Error detecting accident");
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
