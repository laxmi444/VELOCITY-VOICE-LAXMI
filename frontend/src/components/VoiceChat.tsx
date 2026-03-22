import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import ChatMessage, { type ChatMessageData } from "@/components/ChatMessage";
import MicButton from "@/components/MicButton";
import AudioVisualizer from "@/components/AudioVisualizer";
import LoadingIndicator from "@/components/LoadingIndicator";
import {
  transcribeAudio,
  interpretText,
  refineIntent,
  enhancePrompt,
  type InterpretResponse,
} from "@/lib/api";

type FlowStage = "idle" | "recording" | "transcribing" | "interpreting" | "confirming" | "refining" | "enhancing" | "done";

let messageIdCounter = 0;
const genId = () => `msg-${++messageIdCounter}`;

const VoiceChat = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [flowStage, setFlowStage] = useState<FlowStage>("idle");
  const [currentIntent, setCurrentIntent] = useState<InterpretResponse | null>(null);
  const [transcription, setTranscription] = useState("");
  const [refinementHistory, setRefinementHistory] = useState<{ role: string; content: string }[]>([]);
  const [textInput, setTextInput] = useState("");
  const [chosenAction, setChosenAction] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [refineLoading, setRefineLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessageData, "id">) => {
    const newMsg = { ...msg, id: genId() };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  useEffect(scrollToBottom, [messages, flowStage, scrollToBottom]);

  // --- Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleTranscription(blob);
      };

      recorder.start();
      setIsRecording(true);
      setFlowStage("recording");
    } catch {
      toast.error("Microphone access denied. Please allow mic permissions.", {
        action: { label: "Try again", onClick: startRecording },
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // --- Transcription ---
  const handleTranscription = async (blob: Blob) => {
    setFlowStage("transcribing");
    try {
      const result = await transcribeAudio(blob);
      setTranscription(result.transcription);
      addMessage({ role: "user", content: result.transcription, type: "text" });
      await handleInterpretation(result.transcription);
    } catch {
      toast.error("Transcription failed.", {
        action: { label: "Try again", onClick: () => handleTranscription(blob) },
      });
      setFlowStage("idle");
    }
  };

  // --- Interpretation ---
  const handleInterpretation = async (text: string) => {
    setFlowStage("interpreting");
    try {
      const result = await interpretText(text);
      setCurrentIntent(result);
      addMessage({
        role: "assistant",
        content: result.confirmation_message,
        type: "confirmation",
        stage: "Intent",
        actions: true,
      });
      setFlowStage("confirming");
    } catch {
      toast.error("Interpretation failed.", {
        action: { label: "Try again", onClick: () => handleInterpretation(text) },
      });
      setFlowStage("idle");
    }
  };

  // --- Actions ---
  const handleConfirm = async () => {
    setChosenAction("confirm");
    if (currentIntent) await handleEnhancement();
  };

  const handleRefine = async () => {
    setChosenAction("refine");
    setFlowStage("refining");
    setRefinementHistory([]);
    setRefineLoading(true);
    try {
      const result = await refineIntent({
        transcription,
        intent_summary: currentIntent?.intent_summary || "",
        user_answer: null,
        conversation_history: [],
      });
      if (result.updated_intent && currentIntent) {
        setCurrentIntent({ ...currentIntent, intent_summary: result.updated_intent });
      }
      if (result.is_complete) {
        await handleEnhancement();
        return;
      }
      if (result.question) {
        addMessage({ role: "assistant", content: result.question, type: "refinement", stage: "Refinement" });
        setRefinementHistory([{ role: "assistant", content: result.question }]);
      }
    } catch {
      toast.error("Refinement failed.", {
        action: { label: "Try again", onClick: handleRefine },
      });
      setFlowStage("confirming");
    } finally {
      setRefineLoading(false);
    }
  };

  const handleEdit = () => {
    setChosenAction("edit");
    setTextInput(transcription);
    setFlowStage("idle");
  };

  // --- Refinement answer ---
  const handleRefinementAnswer = async (answer: string) => {
    addMessage({ role: "user", content: answer, type: "text" });
    const newHistory = [...refinementHistory, { role: "user", content: answer }];
    setRefinementHistory(newHistory);
    setRefineLoading(true);

    try {
      const result = await refineIntent({
        transcription,
        intent_summary: currentIntent?.intent_summary || "",
        user_answer: answer,
        conversation_history: newHistory,
      });
      if (result.updated_intent && currentIntent) {
        setCurrentIntent({ ...currentIntent, intent_summary: result.updated_intent });
      }
      if (result.is_complete) {
        setRefineLoading(false);
        await handleEnhancement();
        return;
      }
      if (result.question) {
        addMessage({ role: "assistant", content: result.question, type: "refinement", stage: "Refinement" });
        setRefinementHistory([...newHistory, { role: "assistant", content: result.question }]);
      }
    } catch {
      toast.error("Refinement failed.", {
        action: { label: "Try again", onClick: () => handleRefinementAnswer(answer) },
      });
    } finally {
      setRefineLoading(false);
    }
  };

  // --- Enhancement ---
  const handleEnhancement = async () => {
    setFlowStage("enhancing");
    try {
      const result = await enhancePrompt({
        intent_summary: currentIntent?.intent_summary || "",
        tone: currentIntent?.tone || null,
        audience: currentIntent?.audience || null,
        format: currentIntent?.format || null,
      });
      addMessage({
        role: "assistant",
        content: "",
        type: "enhancement",
        stage: "Enhanced",
        enhancedPrompt: result.enhanced_prompt,
        finalOutput: result.final_output,
      });
      setFlowStage("done");
    } catch {
      toast.error("Enhancement failed.", {
        action: { label: "Try again", onClick: handleEnhancement },
      });
      setFlowStage("confirming");
    }
  };

  // --- Start Over ---
  const handleStartOver = () => {
    setMessages([]);
    setFlowStage("idle");
    setCurrentIntent(null);
    setTranscription("");
    setRefinementHistory([]);
    setTextInput("");
    setChosenAction(null);
    messageIdCounter = 0;
  };

  // --- Text submit ---
  const handleTextSubmit = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    setTranscription(text);
    addMessage({ role: "user", content: text, type: "text" });
    setChosenAction(null);
    handleInterpretation(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (flowStage === "refining") {
        const text = textInput.trim();
        if (text) {
          setTextInput("");
          handleRefinementAnswer(text);
        }
      } else {
        handleTextSubmit();
      }
    }
  };

  const isLoading = flowStage === "transcribing" || flowStage === "interpreting" || flowStage === "enhancing";
  const showInput = flowStage === "idle" || flowStage === "refining" || flowStage === "done";

  return (
    <div className="flex flex-col h-screen noise-overlay ambient-glow">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-border">
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Velocity Voice Mode</h1>
          <p className="text-sm text-muted-foreground">Speak your idea. We'll refine it.</p>
        </div>
        <div className="h-[2px] animate-gradient-line" />
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-y-auto scrollbar-none relative z-10">
        <div className="max-w-[720px] mx-auto px-4 py-6 pb-40">
          {messages.length === 0 && flowStage === "idle" && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <div className="w-20 h-20 rounded-full bg-surface border border-primary/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(263, 70%, 58%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-foreground mb-2">Ready to listen</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tap the mic to speak, or type your idea below. Velocity will transcribe, understand, and enhance your prompt.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onConfirm={msg.actions ? handleConfirm : undefined}
              onRefine={msg.actions ? handleRefine : undefined}
              onEdit={msg.actions ? handleEdit : undefined}
              onStartOver={msg.type === "enhancement" ? handleStartOver : undefined}
              actionsDisabled={!!chosenAction}
              chosenAction={msg.actions ? chosenAction : null}
            />
          ))}

          {flowStage === "transcribing" && <LoadingIndicator label="Transcribing" />}
          {flowStage === "interpreting" && <LoadingIndicator label="Interpreting intent" />}
          {flowStage === "enhancing" && <LoadingIndicator label="✨ Enhancing your prompt" />}
          {flowStage === "refining" && refineLoading && <LoadingIndicator label="Thinking..." />}

          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 glass border-t border-border">
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <div className="relative flex items-center gap-3">
            {/* Audio visualizer behind mic */}
            <div className="absolute inset-0 flex items-center pointer-events-none">
              <AudioVisualizer stream={mediaStream} isRecording={isRecording} />
            </div>

            {showInput && (
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={refineLoading}
                placeholder={
                  refineLoading
                    ? "Waiting for response..."
                    : flowStage === "refining"
                    ? "Type your answer..."
                    : "Type your idea or tap the mic..."
                }
                className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
              />
            )}

            {showInput && textInput.trim() && (
              <button
                onClick={() => {
                  if (flowStage === "refining") {
                    const text = textInput.trim();
                    setTextInput("");
                    handleRefinementAnswer(text);
                  } else {
                    handleTextSubmit();
                  }
                }}
                className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-[0.96] transition-all cursor-pointer"
              >
                <Send size={18} />
              </button>
            )}

            {(flowStage === "idle" || flowStage === "recording") && (
              <MicButton isRecording={isRecording} onClick={handleMicClick} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default VoiceChat;
