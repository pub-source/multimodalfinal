import { Scan } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { useRef, useEffect, useState } from "react";
import { drawDetectionBoxes } from "@/lib/drawDetections";

const LowFiSaliency = () => {
  const { isLive, videoRef, saliencyScore, mirrorMode, detections, showBoundingBoxes } = useDetectionContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const smallCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsCountRef = useRef(0);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!smallCanvasRef.current) {
      smallCanvasRef.current = document.createElement("canvas");
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const small = smallCanvasRef.current;
    if (!canvas || !small) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const sctx = small.getContext("2d", { willReadFrequently: true })!;

    const render = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        canvas.width = 640;
        canvas.height = 480;
        ctx.fillStyle = "hsl(220, 20%, 7%)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "hsl(215, 15%, 25%)";
        ctx.font = "14px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for video…", canvas.width / 2, canvas.height / 2);
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      canvas.width = vw;
      canvas.height = vh;

      const downW = Math.max(32, Math.round(vw / 16));
      const downH = Math.max(24, Math.round(vh / 16));
      small.width = downW;
      small.height = downH;

      sctx.drawImage(video, 0, 0, downW, downH);
      const smallData = sctx.getImageData(0, 0, downW, downH);
      const sd = smallData.data;

      for (let i = 0; i < downW * downH; i++) {
        const idx = i * 4;
        const g = 0.299 * sd[idx] + 0.587 * sd[idx + 1] + 0.114 * sd[idx + 2];
        sd[idx] = g;
        sd[idx + 1] = g;
        sd[idx + 2] = g;
      }
      sctx.putImageData(smallData, 0, 0);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, vw, vh);

      // Draw detection boxes with shading on low-fi
      if (showBoundingBoxes && detections.length > 0) {
        drawDetectionBoxes(ctx, detections, vw, vh, vw, vh, { shading: true });
      }

      fpsCountRef.current++;
      animRef.current = requestAnimationFrame(render);
    };

    if (isLive) {
      animRef.current = requestAnimationFrame(render);
    } else {
      canvas.width = 640;
      canvas.height = 480;
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "hsl(215, 15%, 25%)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("No low-fi data", canvas.width / 2, canvas.height / 2);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isLive, videoRef, detections, showBoundingBoxes]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Scan className="w-4 h-4 text-accent" />
        <span>Low-Fi Saliency</span>
        <div className="ml-auto flex items-center gap-2">
          {isLive && <span className="text-[10px] font-mono text-success">{fps} FPS</span>}
          {isLive && <span className="status-dot-live" />}
          <span className="text-xs font-mono">{isLive ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>
      <div className={`relative flex-1 min-h-[200px] overflow-hidden bg-background ${mirrorMode ? "scale-x-[-1]" : ""}`}>
        <canvas ref={canvasRef} className="w-full h-full object-contain" />
        <div className="absolute inset-0 grid-scanline pointer-events-none" />
        {isLive && (
          <div className="absolute bottom-2 left-2 font-mono text-[10px] text-primary/70 bg-background/60 px-2 py-0.5 rounded" style={mirrorMode ? { transform: "scaleX(-1)" } : {}}>
            {saliencyScore.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LowFiSaliency;
