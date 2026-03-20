import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")


def chat_completion(system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
    """Generic wrapper for OpenAI chat completions."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def chat_completion_with_history(
    system_prompt: str, messages: list[dict], temperature: float = 0.7
) -> str:
    """Chat completion with full conversation history (for refinement flow)."""
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = client.chat.completions.create(
        model=MODEL,
        messages=full_messages,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def transcribe_audio(file_path: str, language: str | None = None) -> dict:
    """Transcribe audio using OpenAI Whisper API."""
    with open(file_path, "rb") as audio_file:
        kwargs = {"model": "whisper-1", "file": audio_file, "response_format": "json"}
        if language:
            kwargs["language"] = language

        response = client.audio.transcriptions.create(**kwargs)

    return {"transcription": response.text, "language_detected": language}
