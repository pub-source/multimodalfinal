import { Eye } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { useRef, useEffect, useState } from "react";
import { drawDetectionBoxes } from "@/lib/drawDetections";

type SaliencyMode = "edge" | "motion" | "heatmap";

const SaliencyOutput = () => {
  const { isLive, videoRef, saliencyScore, mirrorMode, detections, showBoundingBoxes } = useDetectionContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fpsCountRef = useRef(0);
  const [fps, setFps] = useState(0);
  const [mode, setMode] = useState<SaliencyMode>("edge");
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    prevFrameRef.current = null;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

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

      ctx.drawImage(video, 0, 0, vw, vh);
      const imageData = ctx.getImageData(0, 0, vw, vh);
      const data = imageData.data;

      if (mode === "motion" || mode === "heatmap") {
        const currentGray = new Uint8ClampedArray(vw * vh);
        for (let i = 0; i < vw * vh; i++) {
          const idx = i * 4;
          currentGray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        }

        if (prevFrameRef.current && prevFrameRef.current.length === currentGray.length) {
          const prev = prevFrameRef.current;
          for (let i = 0; i < vw * vh; i++) {
            const idx = i * 4;
            const diff = Math.abs(currentGray[i] - prev[i]);
            const intensity = Math.min(255, diff * 4);
            if (intensity > 15) {
              const t = intensity / 255;
              if (mode === "heatmap") {
                if (t < 0.5) {
                  const s = t * 2;
                  data[idx]     = Math.round(s * 255);
                  data[idx + 1] = Math.round(s * 200);
                  data[idx + 2] = 0;
                } else {
                  const s = (t - 0.5) * 2;
                  data[idx]     = 255;
                  data[idx + 1] = Math.round(200 * (1 - s));
                  data[idx + 2] = 0;
                }
              } else {
                data[idx]     = Math.round(t * 255);
                data[idx + 1] = Math.round((1 - t) * 200);
                data[idx + 2] = Math.round((1 - t) * 255);
              }
            } else {
              data[idx] = 0;
              data[idx + 1] = 0;
              data[idx + 2] = 0;
            }
            data[idx + 3] = 255;
          }
        } else {
          for (let i = 0; i < vw * vh; i++) {
            const idx = i * 4;
            data[idx] = data[idx + 1] = data[idx + 2] = 0;
            data[idx + 3] = 255;
          }
        }
        prevFrameRef.current = currentGray;
      } else {
        const gray = new Float32Array(vw * vh);
        for (let i = 0; i < vw * vh; i++) {
          const idx = i * 4;
          gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }

        const edges = new Float32Array(vw * vh);
        for (let y = 1; y < vh - 1; y++) {
          for (let x = 1; x < vw - 1; x++) {
            const i = y * vw + x;
            const gx =
              -gray[(y - 1) * vw + (x - 1)] + gray[(y - 1) * vw + (x + 1)]
              - 2 * gray[y * vw + (x - 1)] + 2 * gray[y * vw + (x + 1)]
              - gray[(y + 1) * vw + (x - 1)] + gray[(y + 1) * vw + (x + 1)];
            const gy =
              -gray[(y - 1) * vw + (x - 1)] - 2 * gray[(y - 1) * vw + x] - gray[(y - 1) * vw + (x + 1)]
              + gray[(y + 1) * vw + (x - 1)] + 2 * gray[(y + 1) * vw + x] + gray[(y + 1) * vw + (x + 1)];
            edges[i] = Math.sqrt(gx * gx + gy * gy);
          }
        }

        let maxEdge = 0;
        for (let i = 0; i < edges.length; i++) if (edges[i] > maxEdge) maxEdge = edges[i];
        const edgeScale = maxEdge > 0 ? 255 / maxEdge : 1;

        for (let i = 0; i < vw * vh; i++) {
          const idx = i * 4;
          const edgeVal = Math.min(255, edges[i] * edgeScale);
          const val = Math.min(255, gray[i] * 0.4 + edgeVal * 0.6);
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Draw detection boxes overlay
      if (showBoundingBoxes && detections.length > 0) {
        drawDetectionBoxes(ctx, detections, vw, vh, vw, vh);
      }

      fpsCountRef.current++;
      animRef.current = requestAnimationFrame(render);
    };

    if (isLive) {
      animRef.current = requestAnimationFrame(render);
    } else {
      prevFrameRef.current = null;
      canvas.width = 640;
      canvas.height = 480;
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "hsl(215, 15%, 25%)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("No saliency data", canvas.width / 2, canvas.height / 2);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isLive, videoRef, mode, detections, showBoundingBoxes]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Eye className="w-4 h-4 text-primary" />
        <span>Saliency Output</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "edge" ? "motion" : mode === "motion" ? "heatmap" : "edge")}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {mode.toUpperCase()}
          </button>
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
            SCORE: {saliencyScore.toFixed(2)} • {mode.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaliencyOutput;
