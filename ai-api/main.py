from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import torch
from torchvision import models, transforms
from PIL import Image, UnidentifiedImageError
import io
import os

app = FastAPI(title="Deepfake Detector API")

# ✅ CORS — allow your Render Node backend to call this
# If ai-api is only called by your Node server (server-to-server), "*" is fine.
# If called directly from browser, replace with your Vercel URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Load model ────────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "deepfake_detector.pth")

model = models.resnet18(weights=None)  # ✅ use weights=None (pretrained= is deprecated)
model.fc = torch.nn.Linear(model.fc.in_features, 2)

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
model.eval()

# ✅ Add normalization — required for ResNet (ImageNet stats)
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "message": "Deepfake Detector API is running"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # ✅ Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    contents = await file.read()

    # ✅ Validate file is not empty
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        image = Image.open(io.BytesIO(contents))
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Could not read image file")

    # ✅ Convert to RGB — handles PNG (RGBA), grayscale, etc.
    image = image.convert("RGB")

    tensor = transform(image).unsqueeze(0)  # shape: [1, 3, 224, 224]

    with torch.no_grad():  # ✅ no_grad for inference (saves memory, faster)
        output = model(tensor)
        probabilities = torch.softmax(output, dim=1)  # ✅ real confidence score
        confidence, pred = torch.max(probabilities, 1)

    label = "Real" if pred.item() == 0 else "Fake"
    confidence_pct = f"{confidence.item() * 100:.1f}%"

    return {
        "prediction": label,
        "confidence": confidence_pct,
    }
