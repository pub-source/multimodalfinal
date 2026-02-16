import { Flame } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { useRef, useEffect } from "react";

const SaliencyMap = () => {
  const { detections, saliencyScore, isLive, showHeatmap } = useDetectionContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = 640;
    canvas.height = 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark base
    ctx.fillStyle = "hsl(220, 20%, 7%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isLive || detections.length === 0 || !showHeatmap) {
      ctx.fillStyle = "hsl(215, 15%, 25%)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        !showHeatmap ? "Heatmap disabled" : "No saliency data",
        canvas.width / 2, canvas.height / 2
      );
      return;
    }

    // Draw heatmap blobs at detection locations
    detections.forEach((det) => {
      const [x, y, w, h] = det.bbox;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const radius = Math.max(w, h) * 0.8;
      const isPerson = det.label === "person";

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      if (isPerson || det.confidence > 0.8) {
        gradient.addColorStop(0, `hsla(0, 80%, 50%, ${det.confidence * 0.7})`);
        gradient.addColorStop(0.4, `hsla(38, 90%, 55%, ${det.confidence * 0.5})`);
        gradient.addColorStop(1, "transparent");
      } else {
        gradient.addColorStop(0, `hsla(38, 90%, 55%, ${det.confidence * 0.5})`);
        gradient.addColorStop(0.5, `hsla(185, 80%, 50%, ${det.confidence * 0.3})`);
        gradient.addColorStop(1, "transparent");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    });
  }, [detections, isLive, saliencyScore]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Flame className="w-4 h-4 text-accent" />
        <span>Saliency Map</span>
        <span className="ml-auto text-[10px] font-mono text-accent">
          SCORE: {saliencyScore.toFixed(2)}
        </span>
      </div>
      <div className="relative flex-1 min-h-[200px] overflow-hidden bg-background">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />
        {/* Legend */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 px-2 py-1 rounded text-[9px] font-mono text-muted-foreground">
          <span>Low</span>
          <div
            className="w-16 h-1.5 rounded-full"
            style={{
              background: "linear-gradient(to right, hsl(185, 80%, 50%), hsl(50, 80%, 60%), hsl(38, 90%, 55%), hsl(0, 80%, 50%))",
            }}
          />
          <span>High</span>
        </div>
      </div>
    </div>
  );
};

export default SaliencyMap;
