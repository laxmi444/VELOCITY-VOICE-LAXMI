# Velocity Voice Mode

Voice-driven prompt workflow that converts natural speech (English, Hindi, Hinglish) into structured, enhanced prompts.

## Tech Stack

- **Frontend:** React + Tailwind CSS (built via Lovable)
- **Backend:** FastAPI (Python)
- **Speech-to-Text:** OpenAI Whisper API (`whisper-1`)
- **LLM:** OpenAI GPT-4o-mini (intent interpretation, refinement, enhancement)
- **Audio Capture:** Web Audio API + MediaRecorder

## Transcription Model Used

OpenAI Whisper API (`whisper-1`) with a two-step pipeline:

1. **Whisper** transcribes audio with `language="en"` to force Roman script output
2. **GPT-4o-mini** post-processes the transcription to restore any Hindi words that Whisper may have translated to English

This ensures English stays as-is and Hinglish (mixed Hindi-English) is romanized to preserve both languages naturally.

## Approach to Interpreting Spoken Input

The system uses GPT-4o-mini across three stages:

1. **Intent Extraction** — takes the raw transcription and extracts a structured intent (summary, tone, audience, format), then presents a confirmation: "This is what I understand from your note. Is that correct?"
2. **Refinement** — if the user clicks Refine, the system asks clarification questions one at a time (tone, audience, format) to better understand the user's intent
3. **Enhancement** — once confirmed, the intent is transformed into an enhanced prompt and a final generated output

## How to Run the Project

```bash
git clone https://github.com/laxmi444/VELOCITY-VOICE-LAXMI.git

## Backend
python -m venv venv
venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
# Add your OpenAI API key to .env
uvicorn main:app --reload --port 8000

## Frontend
cd frontend
npm install
npm run dev
```

## Demo Video

> https://drive.google.com/file/d/1n4kF3w85gm141BCRRohMbz8Izr_EhVQc/view?usp=sharing
