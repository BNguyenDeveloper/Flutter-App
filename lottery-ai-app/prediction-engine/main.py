from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional

from models.ensemble import predict_numbers

app = FastAPI(title="Lottery Prediction Engine")


class HistoryItem(BaseModel):
    date: str
    twoDigits: List[str] = Field(default_factory=list)


class PredictRequest(BaseModel):
    # New API contract
    area: Optional[str] = None
    province: Optional[str] = None
    code: Optional[str] = None

    # Backward compatible field
    region: Optional[str] = None

    history: List[HistoryItem] = Field(default_factory=list)
    topK: int = 10


@app.get("/health")
def health():
    return {"status": "ok", "service": "prediction-engine"}


@app.post("/predict")
def predict(payload: PredictRequest):
    history = [item.model_dump() for item in payload.history]
    numbers = predict_numbers(history=history, top_k=payload.topK)

    code = (payload.code or payload.region or "XSMB").upper()

    return {
        "area": payload.area,
        "province": payload.province,
        "code": code,
        "numbers": numbers,
        "model": "frequency_gap_markov_ensemble",
        "disclaimer": "Statistical reference only. No guaranteed winning.",
    }
