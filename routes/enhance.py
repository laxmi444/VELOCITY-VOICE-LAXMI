import json
from fastapi import APIRouter, HTTPException
from models.schemas import EnhanceRequest, EnhanceResponse
from services.llm_service import chat_completion
from services.prompts import ENHANCE_SYSTEM_PROMPT

router = APIRouter()


@router.post("/enhance", response_model=EnhanceResponse)
async def enhance(request: EnhanceRequest):
    """
    Take the confirmed intent and generate an enhanced prompt + final output.
    This is the mock enhancement pipeline.
    """
    if not request.intent_summary.strip():
        raise HTTPException(status_code=400, detail="Intent summary cannot be empty")

    try:
        # Build the user message with all available context
        parts = [f"Intent: {request.intent_summary}"]
        if request.tone:
            parts.append(f"Tone: {request.tone}")
        if request.audience:
            parts.append(f"Audience: {request.audience}")
        if request.format:
            parts.append(f"Format: {request.format}")

        user_message = "\n".join(parts)

        raw_response = chat_completion(
            system_prompt=ENHANCE_SYSTEM_PROMPT,
            user_message=user_message,
            temperature=0.7,
        )

        parsed = json.loads(raw_response)

        return EnhanceResponse(
            original_prompt=request.intent_summary,
            enhanced_prompt=parsed["enhanced_prompt"],
            final_output=parsed["final_output"],
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse LLM response. Please try again.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")
