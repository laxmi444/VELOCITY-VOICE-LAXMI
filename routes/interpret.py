import json
from fastapi import APIRouter, HTTPException
from models.schemas import InterpretRequest, InterpretResponse
from services.llm_service import chat_completion
from services.prompts import INTERPRET_SYSTEM_PROMPT

router = APIRouter()


@router.post("/interpret", response_model=InterpretResponse)
async def interpret(request: InterpretRequest):
    """
    Take raw transcription and return a structured interpretation
    with intent summary, tone, audience, format, and confirmation message.
    """
    if not request.transcription.strip():
        raise HTTPException(status_code=400, detail="Transcription cannot be empty")

    try:
        raw_response = chat_completion(
            system_prompt=INTERPRET_SYSTEM_PROMPT,
            user_message=f"Transcription: {request.transcription}",
            temperature=0.4,
        )

        # Parse JSON response from LLM
        parsed = json.loads(raw_response)

        return InterpretResponse(
            intent_summary=parsed["intent_summary"],
            tone=parsed.get("tone"),
            audience=parsed.get("audience"),
            format=parsed.get("format"),
            confirmation_message=parsed["confirmation_message"],
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse LLM response. Please try again.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")
