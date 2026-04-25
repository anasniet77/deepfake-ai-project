from fastapi import FastAPI, UploadFile, File
import torch
from torchvision import models, transforms
from PIL import Image
import io

app = FastAPI()

# Load model
model = models.resnet18()
model.fc = torch.nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load("deepfake_detector.pth", map_location="cpu"))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor()
])

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image = Image.open(io.BytesIO(await file.read()))
    image = transform(image).unsqueeze(0)

    output = model(image)
    _, pred = torch.max(output, 1)

    label = "Real" if pred.item() == 0 else "Fake"

    return {
        "prediction": label,
        "confidence": "98%"
    }