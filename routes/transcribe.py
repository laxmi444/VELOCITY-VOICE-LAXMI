import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from models.schemas import TranscribeResponse
from services.llm_service import transcribe_audio

router = APIRouter()


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)):
    """
    Accept an audio file and return transcribed text using Whisper.
    Supports: wav, mp3, m4a, webm, ogg, mp4, flac
    """
    filename = audio.filename or "audio.webm"
    ext = os.path.splitext(filename)[1] or ".webm"

    try:
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await audio.read()
            if len(content) == 0:
                raise HTTPException(status_code=400, detail="Empty audio file")
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe with Whisper
        result = transcribe_audio(tmp_path)

        return TranscribeResponse(
            transcription=result["transcription"],
            language_detected=result.get("language_detected"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Cleanup temp file
        if "tmp_path" in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
