import { Contrast } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { useRef, useEffect, useState } from "react";
import { drawDetectionBoxes } from "@/lib/drawDetections";

const ThresholdView = () => {
  const { isLive, videoRef, thresholdLevel, mirrorMode, detections, showBoundingBoxes } = useDetectionContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fpsCountRef = useRef(0);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
            -gray[(y-1)*vw+(x-1)] + gray[(y-1)*vw+(x+1)]
            -2*gray[y*vw+(x-1)] + 2*gray[y*vw+(x+1)]
            -gray[(y+1)*vw+(x-1)] + gray[(y+1)*vw+(x+1)];
          const gy =
            -gray[(y-1)*vw+(x-1)] -2*gray[(y-1)*vw+x] -gray[(y-1)*vw+(x+1)]
            +gray[(y+1)*vw+(x-1)] +2*gray[(y+1)*vw+x] +gray[(y+1)*vw+(x+1)];
          edges[i] = Math.sqrt(gx*gx + gy*gy);
        }
      }

      let maxEdge = 0;
      for (let i = 0; i < edges.length; i++) if (edges[i] > maxEdge) maxEdge = edges[i];
      const scale = maxEdge > 0 ? 255 / maxEdge : 1;

      for (let i = 0; i < vw * vh; i++) {
        const idx = i * 4;
        const edgeVal = edges[i] * scale;
        const combined = gray[i] * 0.3 + edgeVal * 0.7;
        const val = combined > thresholdLevel ? 255 : 0;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
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
      canvas.width = 640;
      canvas.height = 480;
      ctx.fillStyle = "hsl(220, 20%, 7%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "hsl(215, 15%, 25%)";
      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("No threshold data", canvas.width / 2, canvas.height / 2);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [isLive, videoRef, thresholdLevel, detections, showBoundingBoxes]);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Contrast className="w-4 h-4 text-primary" />
        <span>Threshold</span>
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
            THR: {thresholdLevel}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThresholdView;
