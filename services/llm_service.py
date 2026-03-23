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
    """
    Transcribe audio using a two-step approach:
    Step 1: Whisper transcribes with language=en (forces Roman script)
    Step 2: GPT post-processes to fix any translations back to original spoken words
    Supports English, Hindi (romanized), and Hinglish.
    """

    # Step 1: Whisper transcription — force English to guarantee Roman script
    with open(file_path, "rb") as audio_file:
        whisper_response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="json",
            language="en",
            prompt=(
                "bhai sunna, mujhe ek LinkedIn post banana hai about AI. "
                "Ek tweet likhna hai about AI tools for founders but thoda motivational. "
                "yaar kuch likho about machine learning, thoda simple rakhna. "
                "mujhe ek professional summary chahiye LinkedIn ke liye."
            ),
        )

    raw_transcription = whisper_response.text

    # Step 2: GPT post-processing — detect if Hindi words were translated to English
    # and restore them to romanized Hindi
    post_process_response = chat_completion(
        system_prompt=(
            "You are a transcription corrector for a Hinglish voice system.\n\n"
            "You will receive a Whisper transcription of audio that may have been spoken in "
            "English, Hindi, or Hinglish (mixed Hindi-English).\n\n"
            "Whisper sometimes TRANSLATES Hindi words into English instead of keeping them as-is. "
            "Your job is to detect this and fix it.\n\n"
            "RULES:\n"
            "1. If the transcription looks like natural English, return it as-is.\n"
            "2. If it looks like Whisper translated Hindi/Hinglish to English unnaturally, "
            "restore the original Hinglish phrasing in Roman script.\n"
            "3. ALWAYS output in Roman/Latin script. NEVER use Devanagari.\n"
            "4. Do NOT add any explanation. Return ONLY the corrected transcription.\n"
            "5. Keep it as close to what was actually spoken as possible.\n\n"
            "Examples:\n"
            "Input: 'Listen, I want to create a LinkedIn post about AI.'\n"
            "This was likely spoken as Hinglish. Output: 'bhai sunna, mujhe ek LinkedIn post banana hai AI ke baare mein'\n\n"
            "Input: 'Write a tweet about startups in India with an optimistic tone.'\n"
            "This sounds like natural English. Output: 'Write a tweet about startups in India with an optimistic tone.'\n\n"
            "Input: 'I want to make a professional LinkedIn summary.'\n"
            "Could be English or translated Hindi. If it sounds natural, keep as-is.\n"
            "Output: 'I want to make a professional LinkedIn summary.'\n\n"
            "Input: 'I have to write a tweet about AI tools for founders but a little motivational.'\n"
            "This sounds like translated Hinglish. Output: 'Ek tweet likhna hai about AI tools for founders but thoda motivational.'\n"
        ),
        user_message=f"Whisper transcription: {raw_transcription}",
        temperature=0.3,
    )

    return {
        "transcription": post_process_response,
        "language_detected": "auto",
    }
