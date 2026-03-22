const API_BASE = "https://velocity-voice.onrender.com";

export interface TranscribeResponse {
  transcription: string;
  language_detected: string | null;
}

export interface InterpretResponse {
  intent_summary: string;
  tone: string | null;
  audience: string | null;
  format: string | null;
  confirmation_message: string;
}

export interface RefineRequest {
  transcription: string;
  intent_summary: string;
  user_answer: string | null;
  conversation_history: { role: string; content: string }[];
}

export interface RefineResponse {
  question: string | null;
  updated_intent: string | null;
  is_complete: boolean;
}

export interface EnhanceRequest {
  intent_summary: string;
  tone: string | null;
  audience: string | null;
  format: string | null;
}

export interface EnhanceResponse {
  original_prompt: string;
  enhanced_prompt: string;
  final_output: string;
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob);
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Transcription failed");
  return res.json();
}

export async function interpretText(transcription: string): Promise<InterpretResponse> {
  const res = await fetch(`${API_BASE}/api/interpret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcription }),
  });
  if (!res.ok) throw new Error("Interpretation failed");
  return res.json();
}

export async function refineIntent(data: RefineRequest): Promise<RefineResponse> {
  const res = await fetch(`${API_BASE}/api/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Refinement failed");
  return res.json();
}

export async function enhancePrompt(data: EnhanceRequest): Promise<EnhanceResponse> {
  const res = await fetch(`${API_BASE}/api/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Enhancement failed");
  return res.json();
}
