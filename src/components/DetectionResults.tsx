import { Box, User, Armchair, Lamp, Car, Dog, Cat, Smartphone, Monitor, Package } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";

const iconMap: Record<string, React.ReactNode> = {
  person: <User className="w-3.5 h-3.5" />,
  chair: <Armchair className="w-3.5 h-3.5" />,
  lamp: <Lamp className="w-3.5 h-3.5" />,
  car: <Car className="w-3.5 h-3.5" />,
  dog: <Dog className="w-3.5 h-3.5" />,
  cat: <Cat className="w-3.5 h-3.5" />,
  "cell phone": <Smartphone className="w-3.5 h-3.5" />,
  tv: <Monitor className="w-3.5 h-3.5" />,
  laptop: <Monitor className="w-3.5 h-3.5" />,
};

const DetectionResults = () => {
  const { detections } = useDetectionContext();

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Box className="w-4 h-4 text-primary" />
        <span>Object Detection</span>
        <span className="ml-auto text-xs font-mono text-primary">{detections.length} objects</span>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {detections.length === 0 && (
          <div className="text-xs text-muted-foreground font-mono text-center py-8">
            No detections — start camera
          </div>
        )}
        {detections.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
          >
            <div className="text-primary">
              {iconMap[d.label] || <Package className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground capitalize">{d.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground">
                bbox: [{d.bbox.map((v) => Math.round(v)).join(",")}]
              </div>
            </div>
            <div
              className={`text-sm font-mono font-semibold ${
                d.confidence > 0.9 ? "text-success" : d.confidence > 0.7 ? "text-primary" : "text-accent"
              }`}
            >
              {(d.confidence * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetectionResults;
