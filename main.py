from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import transcribe, interpret, refine, enhance

app = FastAPI(
    title="Velocity Voice Mode",
    description="Backend for Velocity Voice Mode — converts speech into structured prompts",
    version="1.0.0",
)

# CORS — allow Lovable frontend and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe.router, prefix="/api", tags=["Transcription"])
app.include_router(interpret.router, prefix="/api", tags=["Interpretation"])
app.include_router(refine.router, prefix="/api", tags=["Refinement"])
app.include_router(enhance.router, prefix="/api", tags=["Enhancement"])


@app.get("/")
async def root():
    return {"status": "ok", "message": "Velocity Voice Mode API is running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
