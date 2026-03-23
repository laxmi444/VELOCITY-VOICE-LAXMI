import json
import re
import logging
import traceback
from fastapi import APIRouter, Request
from models.schemas import RefineRequest, RefineResponse
from services.llm_service import chat_completion

router = APIRouter()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def parse_json_response(raw: str) -> dict:
    """Parse JSON from LLM response, handling markdown backticks and extra text."""
    cleaned = re.sub(r"```json\s*", "", raw)
    cleaned = re.sub(r"```\s*", "", cleaned)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


def extract_history_text(conversation_history) -> str:
    """Safely extract readable text from conversation history, no matter the format."""
    if not conversation_history:
        return ""

    lines = []
    try:
        if isinstance(conversation_history, list):
            for item in conversation_history:
                if isinstance(item, dict):
                    role = item.get("role", "unknown")
                    content = item.get("content", str(item))
                    if role == "assistant":
                        lines.append(f"  System asked: {content}")
                    elif role == "user":
                        lines.append(f"  User answered: {content}")
                    else:
                        lines.append(f"  {role}: {content}")
                elif isinstance(item, str):
                    lines.append(f"  {item}")
        elif isinstance(conversation_history, str):
            lines.append(f"  {conversation_history}")
    except Exception as e:
        logger.error(f"Error parsing conversation_history: {e}")
        lines.append("  (previous conversation context unavailable)")

    return "\n".join(lines)


# Questions to cycle through as fallback
FALLBACK_QUESTIONS = [
    "What tone would you like? (e.g., professional, casual, humorous, motivational)",
    "Who is the target audience for this content?",
    "How long should the content be? (e.g., short, medium, detailed)",
]


REFINE_PROMPT = """You are a refinement assistant for Velocity Voice Mode.

You help refine a user's prompt by asking ONE clarification question at a time.

CONTEXT PROVIDED:
- The original transcription (what the user said)
- The current intent summary
- Previous Q&A rounds (if any)

YOUR TASK:
Look at what information is STILL MISSING and ask about the NEXT most important missing piece.

Priority order for questions:
1. Tone (professional, casual, humorous, motivational, etc.)
2. Target audience (who is the content for?)
3. Specific themes or points to highlight
4. Length or format details

IMPORTANT RULES:
- Ask only ONE question
- NEVER ask about something already answered
- If 2 or more questions have been answered, set is_complete to true
- When is_complete is true, you MUST provide updated_intent that includes ALL gathered info

RESPOND WITH ONLY THIS JSON — no markdown backticks, no explanation, ONLY the JSON object:
{"question": "your single question here", "updated_intent": null, "is_complete": false}

When complete:
{"question": null, "updated_intent": "full updated intent with all details", "is_complete": true}"""


@router.post("/refine")
async def refine(request: Request):
    """
    Iterative refinement — bulletproof, never returns an error.
    Accepts any JSON body shape.
    """
    # Parse the raw body manually for maximum flexibility
    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse request body: {e}")
        return RefineResponse(
            question=FALLBACK_QUESTIONS[0],
            updated_intent=None,
            is_complete=False,
        ).model_dump()

    transcription = body.get("transcription", "")
    intent_summary = body.get("intent_summary", "")
    user_answer = body.get("user_answer", None)
    conversation_history = body.get("conversation_history", [])

    logger.info(f"=== REFINE REQUEST ===")
    logger.info(f"Transcription: {transcription}")
    logger.info(f"Intent: {intent_summary}")
    logger.info(f"User answer: {user_answer}")
    logger.info(f"History type: {type(conversation_history)}")
    logger.info(f"History: {conversation_history}")

    # Count how many answers have been given
    answer_count = 0
    if conversation_history and isinstance(conversation_history, list):
        answer_count = sum(1 for item in conversation_history
                          if isinstance(item, dict) and item.get("role") == "user")
    if user_answer:
        answer_count += 1

    # If we've gathered enough info (3+ answers), mark complete
    if answer_count >= 3:
        return {
            "question": None,
            "updated_intent": f"{intent_summary} (with user's refined preferences)",
            "is_complete": True,
        }

    try:
        # Build user message
        history_text = extract_history_text(conversation_history)

        user_msg = f"Original transcription: {transcription}\n"
        user_msg += f"Current intent summary: {intent_summary}\n"

        if history_text:
            user_msg += f"\nPrevious Q&A rounds:\n{history_text}\n"

        if user_answer:
            user_msg += f"\nUser's latest answer: {user_answer}\n"
            user_msg += "\nAsk the NEXT clarification question about a DIFFERENT topic. If enough info is gathered, set is_complete to true."
        else:
            user_msg += "\nThis is the first round. Ask the most important clarification question."

        logger.info(f"Sending to LLM: {user_msg}")

        raw_response = chat_completion(
            system_prompt=REFINE_PROMPT,
            user_message=user_msg,
            temperature=0.2,
        )

        logger.info(f"LLM raw response: {raw_response}")

        parsed = parse_json_response(raw_response)

        if parsed:
            return {
                "question": parsed.get("question"),
                "updated_intent": parsed.get("updated_intent"),
                "is_complete": parsed.get("is_complete", False),
            }
        else:
            # JSON parse failed — use fallback question
            fallback_idx = min(answer_count, len(FALLBACK_QUESTIONS) - 1)
            logger.warning(f"JSON parse failed, using fallback question {fallback_idx}")
            return {
                "question": FALLBACK_QUESTIONS[fallback_idx],
                "updated_intent": None,
                "is_complete": False,
            }

    except Exception as e:
        logger.error(f"Refinement exception: {e}")
        logger.error(traceback.format_exc())
        # Always return something useful, never crash
        fallback_idx = min(answer_count, len(FALLBACK_QUESTIONS) - 1)
        return {
            "question": FALLBACK_QUESTIONS[fallback_idx],
            "updated_intent": None,
            "is_complete": False,
        }
