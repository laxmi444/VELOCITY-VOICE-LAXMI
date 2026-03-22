import { Check, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  type?: "text" | "confirmation" | "refinement" | "enhancement";
  stage?: string;
  enhancedPrompt?: string;
  finalOutput?: string;
  actions?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onConfirm?: () => void;
  onRefine?: () => void;
  onEdit?: () => void;
  onStartOver?: () => void;
  actionsDisabled?: boolean;
  chosenAction?: string | null;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
};

const ChatMessage = ({ message, onConfirm, onRefine, onEdit, onStartOver, actionsDisabled, chosenAction }: ChatMessageProps) => {
  const isUser = message.role === "user";

  if (message.type === "enhancement") {
    return (
      <div className="flex justify-start mb-4 animate-message-in">
        <div className="max-w-[95%] space-y-3">
          {message.stage && (
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              {message.stage}
            </span>
          )}

          {message.enhancedPrompt && (
            <div className="relative glass-surface rounded-2xl p-5 border-l-[3px] border-l-primary">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium block mb-2">
                Enhanced Prompt
              </span>
              <p className="text-[15px] leading-relaxed text-foreground">{message.enhancedPrompt}</p>
            </div>
          )}

          {message.finalOutput && (
            <div className="relative rounded-2xl p-5 bg-surface-elevated border border-border border-l-[3px] border-l-accent">
              <CopyButton text={message.finalOutput} />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium block mb-2">
                Final Output
              </span>
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap pr-8">{message.finalOutput}</p>
            </div>
          )}

          {onStartOver && (
            <button
              onClick={onStartOver}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm text-primary border border-primary/30 hover:bg-primary/10 transition-all cursor-pointer mt-2"
            >
              <RotateCcw size={14} />
              Start Over
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-message-in`}>
      <div className={`max-w-[85%] ${isUser ? "" : ""}`}>
        {message.stage && !isUser && (
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium block mb-1.5 ml-1">
            {message.stage}
          </span>
        )}
        <div
          className={
            isUser
              ? "gradient-user-bubble glow-violet rounded-2xl rounded-br-lg px-4 py-3 text-white"
              : "bg-surface border border-border rounded-2xl rounded-bl-lg px-4 py-3 text-foreground"
          }
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {message.actions && !actionsDisabled && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
              <button
                onClick={onConfirm}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  chosenAction === "confirm"
                    ? "bg-primary text-primary-foreground glow-violet"
                    : chosenAction
                    ? "opacity-0 pointer-events-none"
                    : "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97]"
                }`}
              >
                ✅ Confirm
              </button>
              <button
                onClick={onRefine}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                  chosenAction === "refine"
                    ? "border-primary text-primary glow-violet"
                    : chosenAction
                    ? "opacity-0 pointer-events-none"
                    : "border-primary/30 text-primary hover:border-primary/60 active:scale-[0.97]"
                }`}
              >
                🔄 Refine
              </button>
              <button
                onClick={onEdit}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer ${
                  chosenAction === "edit"
                    ? "border-muted-foreground text-muted-foreground"
                    : chosenAction
                    ? "opacity-0 pointer-events-none"
                    : "border-muted/40 text-muted-foreground hover:border-muted-foreground/40 active:scale-[0.97]"
                }`}
              >
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
