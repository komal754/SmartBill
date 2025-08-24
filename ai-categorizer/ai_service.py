
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

# Define a wide variety of possible categories
categories = [
    "Food", "Transport", "Groceries", "Entertainment", "Utilities", "Shopping", "Health", "Education", "Travel", "Bills", "Subscriptions", "Gifts", "Insurance", "Rent", "Salary", "Investment", "Charity", "Pets", "Kids", "Personal Care", "Beauty", "Clothing", "Recharge", "Petrol", "Home Items", "Stationary", "Phone Accessory", "Laptop and Computer Accessory", "Other"
]

# Load the zero-shot-classification pipeline (faster model)
classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-1")

class CategorizeRequest(BaseModel):
    description: str

@app.post("/categorize")
async def categorize(req: CategorizeRequest):
    print(f"[INFO] Received description: {req.description}")
    result = classifier(req.description, categories)
    print(f"[INFO] Predicted category: {result['labels'][0]}")
    return {"category": result['labels'][0]}