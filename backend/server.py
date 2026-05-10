"""
KrishiMitra / AgriSathi backend.
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Literal, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("krishimitra")

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
DEFAULT_MODEL_NAME = os.environ.get("DEFAULT_MODEL_NAME", "gemini-2.5-flash").strip()

CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "*").split(",")
    if o.strip()
]

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


SYSTEM_PROMPTS = {
    "en": (
        "You are KrishiMitra, a practical farming assistant for Indian farmers. "
        "Reply in simple natural spoken English. "
        "Do not use markdown, stars, bullet points, headings, emojis, or symbols. "
        "Keep answers short, clear, and easy to understand when spoken aloud. "
        "Focus on crop disease, fertilizer, irrigation, pest control, weather advice, and farming help."
    ),

    "hi": (
        "आप KrishiMitra हैं — भारतीय किसानों के लिए कृषि सहायक। "
        "सरल और प्राकृतिक हिंदी में जवाब दें। "
        "Markdown, star, bullet points, heading, emoji या symbols का उपयोग न करें। "
        "उत्तर ऐसे दें जैसे किसी किसान से सीधे बात कर रहे हों। "
        "फसल रोग, सिंचाई, खाद, कीट नियंत्रण और मौसम सलाह पर ध्यान दें।"
    ),

    "mr": (
        "तुम्ही KrishiMitra आहात — भारतीय शेतकऱ्यांसाठी कृषी सहाय्यक. "
        "सोप्या आणि नैसर्गिक मराठीत उत्तर द्या. "
        "Markdown, stars, bullet points, heading, emoji किंवा symbols वापरू नका. "
        "उत्तर असे द्या जसे तुम्ही थेट शेतकऱ्याशी बोलत आहात. "
        "पीक रोग, सिंचन, खत, कीड नियंत्रण आणि हवामान सल्ल्यावर लक्ष द्या."
    ),
}

FALLBACK_REPLIES = {
    "en": "I'm offline right now. Please try again in a moment.",
    "hi": "अभी मैं ऑफलाइन हूँ। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    "mr": "सध्या मी ऑफलाइन आहे. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.",
}


def normalise_language(value: Optional[str]) -> Literal["en", "hi", "mr"]:
    if not value:
        return "en"
    v = value.strip().lower()
    if v in {"hi", "hindi", "हिंदी", "हिन्दी"}:
        return "hi"
    if v in {"mr", "marathi", "मराठी"}:
        return "mr"
    return "en"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    language: Optional[str] = "en"
    session_id: Optional[str] = None
    history: Optional[list[ChatMessage]] = None


class ChatResponse(BaseModel):
    reply: str
    language: Literal["en", "hi", "mr"]
    session_id: str
    source: Literal["llm", "fallback"]


class DiseaseAnalysisResponse(BaseModel):
    crop: str
    disease: str
    confidence: str
    urgency: str
    symptoms: list[str]
    causes: list[str]
    next_steps: list[str]
    prevention: list[str]
    language: Literal["en", "hi", "mr"]
    source: Literal["llm", "fallback"]


class WeatherSnapshot(BaseModel):
    place: str
    temp_c: float
    condition: str
    humidity: int
    rain_chance: int
    source: Literal["mock", "live"] = "mock"


async def call_llm(prompt: str, language: str, session_id: str, history: list[ChatMessage]) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = genai.GenerativeModel(
        DEFAULT_MODEL_NAME,
        system_instruction=SYSTEM_PROMPTS[language],
    )

    transcript = ""
    for turn in history[-6:]:
        speaker = "User" if turn.role == "user" else "Assistant"
        transcript += f"{speaker}: {turn.content.strip()}\n"

    transcript += f"User: {prompt.strip()}"

    response = model.generate_content(transcript)
    return response.text.strip()


async def call_vision_llm(image_bytes: bytes, mime_type: str, language: str, crop: str = "") -> dict:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = genai.GenerativeModel(
        DEFAULT_MODEL_NAME,
        system_instruction=(
            "You are an expert agriculture scientist. "
            "Always give detailed structured crop disease analysis for Indian farmers."
        ),
    )

    prompt = f"""
You are KrishiMitra AI — an expert agricultural scientist helping Indian farmers.

Analyze the crop/plant image deeply and give a professional diagnosis.

Crop hint: {crop or "unknown"}

Return ONLY valid JSON in this exact structure:

{{
  "crop": "exact crop name or unknown",
  "disease": "specific disease/pest/nutrient deficiency",
  "confidence": "low/medium/high",
  "urgency": "low/medium/high",
  "symptoms": [
    "detailed visible symptom 1",
    "detailed visible symptom 2",
    "pattern on leaves/stem/fruit"
  ],
  "causes": [
    "biological reason such as fungus, pest, bacteria, deficiency",
    "environmental reason such as soil, irrigation, humidity"
  ],
  "next_steps": [
    "step-by-step treatment",
    "immediate action farmer should take",
    "spray or solution guidance without exact chemical dosage"
  ],
  "prevention": [
    "future prevention method",
    "best farming practices"
  ]
}}

Important:
- Answer in {language}.
- Give detailed explanation.
- If image is unclear, keep confidence low and ask for a clearer photo.
- Do not invent exact chemical quantities or dosages.
"""

    try:
        response = model.generate_content([
            prompt,
            {
                "mime_type": mime_type,
                "data": image_bytes,
            },
        ])

        text = response.text.strip()

        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        result = json.loads(text)

        return {
            "crop": result.get("crop", crop or "unknown"),
            "disease": result.get("disease", "Not identified clearly"),
            "confidence": result.get("confidence", "low"),
            "urgency": result.get("urgency", "medium"),
            "symptoms": result.get("symptoms", []),
            "causes": result.get("causes", []),
            "next_steps": result.get("next_steps", []),
            "prevention": result.get("prevention", []),
        }

    except Exception:
        logger.exception("Vision AI failed, using fallback")
        return {
            "crop": crop or "unknown",
            "disease": "Image analysis failed",
            "confidence": "low",
            "urgency": "medium",
            "symptoms": ["Unable to analyze image clearly"],
            "causes": ["Image may be blurry, dark, or unclear"],
            "next_steps": [
                "Upload a clearer close-up image",
                "Capture both front and back side of the leaf",
                "Ensure good lighting",
            ],
            "prevention": ["Maintain healthy crop conditions"],
        }


app = FastAPI(title="KrishiMitra AI API", version="1.0.0")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "krishimitra-ai",
        "llm_configured": bool(GEMINI_API_KEY),
        "model": f"gemini:{DEFAULT_MODEL_NAME}",
    }


@api_router.get("/ai/models")
async def list_models():
    models = []
    for m in genai.list_models():
        methods = getattr(m, "supported_generation_methods", [])
        if "generateContent" in methods:
            models.append({"name": m.name, "methods": methods})
    return {"models": models}


@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(payload: ChatRequest) -> ChatResponse:
    language = normalise_language(payload.language)
    session_id = payload.session_id or f"krishi-{uuid.uuid4().hex[:12]}"
    history = payload.history or []

    try:
        reply = await call_llm(payload.message, language, session_id, history)
        if not reply:
            raise RuntimeError("Empty LLM response")
        source: Literal["llm", "fallback"] = "llm"
    except Exception:
        logger.exception("LLM call failed, serving fallback")
        reply = FALLBACK_REPLIES[language]
        source = "fallback"

    return ChatResponse(
        reply=reply,
        language=language,
        session_id=session_id,
        source=source,
    )


@api_router.post("/ai/disease", response_model=DiseaseAnalysisResponse)
async def analyze_disease(
    image: UploadFile = File(...),
    language: str = Form("en"),
    crop: str = Form(""),
) -> DiseaseAnalysisResponse:
    lang = normalise_language(language)

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file")

    image_bytes = await image.read()

    result = await call_vision_llm(
        image_bytes=image_bytes,
        mime_type=image.content_type,
        language=lang,
        crop=crop,
    )

    return DiseaseAnalysisResponse(
        crop=result.get("crop", crop or "unknown"),
        disease=result.get("disease", "Unable to identify clearly"),
        confidence=result.get("confidence", "low"),
        urgency=result.get("urgency", "medium"),
        symptoms=result.get("symptoms", []),
        causes=result.get("causes", []),
        next_steps=result.get("next_steps", []),
        prevention=result.get("prevention", []),
        language=lang,
        source="llm",
    )


@api_router.get("/weather", response_model=WeatherSnapshot)
async def weather(place: str = "Pune Region") -> WeatherSnapshot:
    return WeatherSnapshot(
        place=place,
        temp_c=32.0,
        condition="Partly cloudy",
        humidity=58,
        rain_chance=30,
        source="mock",
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    logger.info(
        "KrishiMitra AI API ready (llm_configured=%s, model=gemini:%s)",
        bool(GEMINI_API_KEY),
        DEFAULT_MODEL_NAME,
    )