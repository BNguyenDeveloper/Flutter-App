from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List
from models.ensemble import predict_numbers

app = FastAPI(title="Lottery Prediction Engine")

class HistoryItem(BaseModel):
    date: str
    twoDigits: List[str] = Field(default_factory=list)

class PredictRequest(BaseModel):
    region: str = "MB"
    history: List[HistoryItem]
    topK: int = 10

@app.get("/health")
def health():
    return {"status": "ok", "service": "prediction-engine"}

@app.post("/predict")
def predict(payload: PredictRequest):
    history = [item.model_dump() for item in payload.history]
    numbers = predict_numbers(history=history, top_k=payload.topK)
    return {
        "region": payload.region,
        "numbers": numbers,
        "model": "frequency_gap_markov_ensemble",
        "disclaimer": "Statistical reference only. No guaranteed winning."
    }
