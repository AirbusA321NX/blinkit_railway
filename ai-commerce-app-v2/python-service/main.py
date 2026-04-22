from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from lettucedetect.models.inference import HallucinationDetector
import torch

app = FastAPI()

# Initialize the detector using the official ModernBERT base model
# Using 'transformer' method as per documentation
print("Loading LettuceDetect (ModernBERT Base)...")
detector = HallucinationDetector(
    method="transformer", 
    model_path="KRLabsOrg/lettucedect-base-modernbert-en-v1"
)

class DetectionRequest(BaseModel):
    context: List[str]
    question: str
    answer: str

class DetectionResponse(BaseModel):
    is_hallucination: bool
    predictions: List[dict]

@app.post("/detect")
async def detect_hallucination(request: DetectionRequest):
    try:
        # Get span-level predictions
        predictions = detector.predict(
            context=request.context, 
            question=request.question, 
            answer=request.answer, 
            output_format="spans"
        )
        
        # If there are any hallucinated spans, mark as hallucination
        is_hallucinated = len(predictions) > 0

        return DetectionResponse(
            is_hallucination=is_hallucinated,
            predictions=predictions
        )
    except Exception as e:
        print(f"Detection Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Run on 8001 to avoid conflict with Next.js
    uvicorn.run(app, host="0.0.0.0", port=8001)
