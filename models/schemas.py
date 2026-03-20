from pydantic import BaseModel
from typing import Optional


# --- Transcription ---
class TranscribeResponse(BaseModel):
    transcription: str
    language_detected: Optional[str] = None


# --- Interpretation ---
class InterpretRequest(BaseModel):
    transcription: str


class InterpretResponse(BaseModel):
    intent_summary: str
    tone: Optional[str] = None
    audience: Optional[str] = None
    format: Optional[str] = None
    confirmation_message: str


# --- Refinement ---
class RefineRequest(BaseModel):
    transcription: str
    intent_summary: str
    user_answer: Optional[str] = None
    conversation_history: list[dict] = []


class RefineResponse(BaseModel):
    question: Optional[str] = None
    updated_intent: Optional[str] = None
    is_complete: bool = False


# --- Enhancement ---
class EnhanceRequest(BaseModel):
    intent_summary: str
    tone: Optional[str] = None
    audience: Optional[str] = None
    format: Optional[str] = None


class EnhanceResponse(BaseModel):
    original_prompt: str
    enhanced_prompt: str
    final_output: str
