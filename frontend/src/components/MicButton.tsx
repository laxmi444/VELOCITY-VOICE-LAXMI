import { Mic, Square } from "lucide-react";

interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

const MicButton = ({ isRecording, onClick }: MicButtonProps) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Sonar rings */}
      {isRecording && (
        <>
          <span className="absolute w-16 h-16 rounded-full border border-primary/30 animate-sonar" />
          <span className="absolute w-16 h-16 rounded-full border border-primary/20 animate-sonar-delayed" />
        </>
      )}

      <button
        onClick={onClick}
        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
          isRecording
            ? "bg-surface animate-pulse-glow border border-primary/50"
            : "bg-surface border border-primary/30 hover:border-primary/60 hover:shadow-[0_0_20px_hsl(263_70%_58%/0.2)] active:scale-[0.96]"
        }`}
      >
        {isRecording ? (
          <Square size={20} className="text-destructive" fill="currentColor" />
        ) : (
          <Mic size={24} className="text-primary" />
        )}
      </button>

      {/* Label */}
      {isRecording && (
        <span className="absolute -top-8 text-xs font-medium text-accent tracking-wide animate-pulse">
          Listening...
        </span>
      )}
    </div>
  );
};

export default MicButton;
