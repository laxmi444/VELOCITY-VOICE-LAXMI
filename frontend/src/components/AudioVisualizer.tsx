import { useRef, useEffect, useState } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

const AudioVisualizer = ({ stream, isRecording }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!stream || !isRecording || !canvasRef.current) return;

    setFadingOut(false);
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const barCount = 32;
      const gap = 3;
      const totalGap = (barCount - 1) * gap;
      const barWidth = (w - totalGap) / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] / 255;
        const barHeight = Math.max(2, value * h * 0.8);

        const x = i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${0.4 + value * 0.5})`;
        ctx.shadowColor = "rgba(34, 211, 238, 0.3)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      audioCtx.close();
    };
  }, [stream, isRecording]);

  useEffect(() => {
    if (!isRecording && analyserRef.current) {
      setFadingOut(true);
      const timer = setTimeout(() => setFadingOut(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  if (!isRecording && !fadingOut) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-16 pointer-events-none transition-opacity duration-500"
      style={{ opacity: fadingOut ? 0 : 1 }}
    />
  );
};

export default AudioVisualizer;
