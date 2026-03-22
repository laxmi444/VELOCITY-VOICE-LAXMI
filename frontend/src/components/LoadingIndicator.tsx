interface LoadingIndicatorProps {
  label?: string;
}

const LoadingIndicator = ({ label = "Processing" }: LoadingIndicatorProps) => {
  return (
    <div className="flex justify-start mb-4 animate-message-in">
      <div className="bg-surface border border-border rounded-2xl rounded-bl-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] text-muted-foreground">{label}</span>
          <span className="dot-pulse flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
