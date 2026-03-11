import type { Detection } from "@/context/DetectionContext";

/**
 * Draw detection bounding boxes on a canvas context.
 * Supports priority highlighting for person/fire and optional shading fill.
 */
export function drawDetectionBoxes(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number,
  options?: { shading?: boolean }
) {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  detections.forEach((d) => {
    const [bx, by, bw, bh] = d.bbox;
    const x = bx * scaleX;
    const y = by * scaleY;
    const w = bw * scaleX;
    const h = bh * scaleY;

    const isPerson = d.label === "person";
    const isFire = d.label === "fire";
    const color = isFire
      ? "hsl(15, 90%, 55%)"
      : isPerson
      ? "hsl(0, 70%, 55%)"
      : "hsl(185, 80%, 50%)";
    const colorAlpha = isFire
      ? "hsla(15, 90%, 55%, 0.8)"
      : isPerson
      ? "hsla(0, 70%, 55%, 0.8)"
      : "hsla(185, 80%, 50%, 0.8)";

    // Optional shading fill
    if (options?.shading) {
      ctx.fillStyle = isFire
        ? "hsla(15, 90%, 55%, 0.25)"
        : isPerson
        ? "hsla(0, 70%, 55%, 0.2)"
        : "hsla(185, 80%, 50%, 0.15)";
      ctx.fillRect(x, y, w, h);
    }

    // Bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Label
    const label = `${d.label} ${(d.confidence * 100).toFixed(0)}%`;
    ctx.font = "11px 'JetBrains Mono', monospace";
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = colorAlpha;
    ctx.fillRect(x, y - 16, textW + 6, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x + 3, y - 4);

    // Corner brackets
    const bl = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + bl); ctx.lineTo(x, y); ctx.lineTo(x + bl, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - bl, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + bl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h - bl); ctx.lineTo(x, y + h); ctx.lineTo(x + bl, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - bl, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - bl); ctx.stroke();
  });
}
