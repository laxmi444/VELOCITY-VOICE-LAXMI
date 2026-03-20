import json
from fastapi import APIRouter, HTTPException
from models.schemas import RefineRequest, RefineResponse
from services.llm_service import chat_completion_with_history
from services.prompts import REFINE_SYSTEM_PROMPT

router = APIRouter()


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

        parsed = json.loads(raw_response)

        return RefineResponse(
            question=parsed.get("question"),
            updated_intent=parsed.get("updated_intent"),
            is_complete=parsed.get("is_complete", False),
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse LLM response. Please try again.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refinement failed: {str(e)}")
