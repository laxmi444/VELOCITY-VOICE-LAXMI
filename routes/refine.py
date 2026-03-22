import json
import re
import logging
from fastapi import APIRouter, HTTPException
from models.schemas import RefineRequest, RefineResponse
from services.llm_service import chat_completion_with_history
from services.prompts import REFINE_SYSTEM_PROMPT

router = APIRouter()
logger = logging.getLogger(__name__)


def parse_json_response(raw: str) -> dict:
    """Parse JSON from LLM response, handling markdown backticks and extra text."""
    # Strip markdown code fences
    cleaned = re.sub(r"```json\s*", "", raw)
    cleaned = re.sub(r"```\s*", "", cleaned)
    cleaned = cleaned.strip()

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find JSON object in the text
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from: {raw}")


@router.post("/refine", response_model=RefineResponse)
async def refine(request: RefineRequest):
    """
    Iterative refinement — asks one clarification question at a time.
    Send conversation_history to maintain context across rounds.
    """
    if not request.intent_summary.strip():
        raise HTTPException(status_code=400, detail="Intent summary cannot be empty")

    try:
        # Build conversation messages
        messages = []

        # Initial context
        context = (
            f"Original transcription: {request.transcription}\n"
            f"Current intent summary: {request.intent_summary}"
        )
        messages.append({"role": "user", "content": context})

        # Add any prior conversation history (previous Q&A rounds)
        for msg in request.conversation_history:
            messages.append(msg)

        # Add latest user answer if provided
        if request.user_answer:
            messages.append({"role": "user", "content": request.user_answer})

        raw_response = chat_completion_with_history(
            system_prompt=REFINE_SYSTEM_PROMPT,
            messages=messages,
            temperature=0.5,
        )

        logger.info(f"Refine raw LLM response: {raw_response}")

        parsed = parse_json_response(raw_response)

        return RefineResponse(
            question=parsed.get("question"),
            updated_intent=parsed.get("updated_intent"),
            is_complete=parsed.get("is_complete", False),
        )

    except ValueError as e:
        logger.error(f"JSON parse error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse LLM response. Please try again.",
        )
    except Exception as e:
        logger.error(f"Refinement error: {e}")
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")