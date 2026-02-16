from fastapi import FastAPI, File, UploadFile
from ultralytics import YOLO
from PIL import Image
import shutil
import os
import uuid

# ---------------------------
# App Initialization
# ---------------------------
app = FastAPI(
    title="Community Urban Issue Detection API",
    description="Detect potholes, waste dumping, and road accidents using AI",
    version="1.0"
)

# ---------------------------
# Load Models
# ---------------------------
pothole_model = YOLO("ai_model/pothole.pt")
waste_model = YOLO("ai_model/waste.pt")
accident_model = YOLO("ai_model/accident_new.pt")

# ---------------------------
# Upload Directory
# ---------------------------
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

SUPPORTED_FORMATS = (".jpg", ".jpeg", ".png", ".jfif")

# ---------------------------
# Detection Endpoint
# ---------------------------
@app.post("/detect")
async def detect_issue(file: UploadFile = File(...)):

    filename = file.filename.lower()

    # ---------------------------
    # File format check
    # ---------------------------
    if not filename.endswith(SUPPORTED_FORMATS):
        return {
            "error": "Unsupported image format",
            "supported_formats": ["jpg", "jpeg", "png", "jfif"]
        }

    # ---------------------------
    # Save uploaded file
    # ---------------------------
    unique_name = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ---------------------------
    # Convert JFIF → JPG
    # ---------------------------
    if file_path.endswith(".jfif"):
        img = Image.open(file_path).convert("RGB")
        new_path = file_path.replace(".jfif", ".jpg")
        img.save(new_path, "JPEG")
        os.remove(file_path)
        file_path = new_path

    detections = []

    # ---------------------------
    # POTHOLE DETECTION
    # ---------------------------
    pothole_results = pothole_model(file_path, conf=0.45)
    if pothole_results[0].boxes:
        detections.append({
            "issue": "Pothole",
            "confidence": round(float(pothole_results[0].boxes[0].conf), 3),
            "alert": ["Municipality", "PWD"],
            "priority": "Medium"
        })

    # ---------------------------
    # WASTE DUMPING DETECTION
    # ---------------------------
    waste_results = waste_model(file_path, conf=0.45)
    if waste_results[0].boxes:
        detections.append({
            "issue": "Illegal Waste Dumping",
            "confidence": round(float(waste_results[0].boxes[0].conf), 3),
            "alert": ["Municipality", "Sanitation Department"],
            "priority": "Medium"
        })

    # ---------------------------
    # ACCIDENT DETECTION (STRICT)
    # ---------------------------
    accident_results = accident_model(file_path, conf=0.6)
    if accident_results[0].boxes:
        detections.append({
            "issue": "Road Accident",
            "confidence": round(float(accident_results[0].boxes[0].conf), 3),
            "alert": ["Police", "Ambulance", "Fire Station"],
            "priority": "High"
        })

    # ---------------------------
    # No Issue Case
    # ---------------------------
    if not detections:
        return {
            "issue": "No major issue detected",
            "confidence": 0,
            "alert": [],
            "priority": "Low"
        }

    return {
        "status": "Issue detected",
        "detections": detections
    }
