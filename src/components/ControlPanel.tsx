import { Settings, Eye, EyeOff, Flame, Bell, BellOff, Monitor, Upload, Mic, FileAudio, Radio, FlipHorizontal, Gauge, Bug, ChevronDown } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

const RESOLUTIONS = [
  { label: "720p", value: "1280x720" },
  { label: "1080p", value: "1920x1080" },
  { label: "1440p", value: "2560x1440" },
  { label: "4K", value: "3840x2160" },
];

interface CameraDebugInfo {
  deviceId: string;
  label: string;
}

const ControlPanel = () => {
  const {
    showBoundingBoxes, setShowBoundingBoxes,
    showHeatmap, setShowHeatmap,
    enableAlerts, setEnableAlerts,
    simulationMode, setSimulationMode,
    videoMode, setVideoMode,
    audioMode, setAudioMode,
    isLive, isRecording,
    resolution, setResolution,
    cctvUrl, setCctvUrl,
    thresholdLevel, setThresholdLevel,
    mirrorMode, setMirrorMode,
    qualityMode, setQualityMode,
  } = useDetectionContext();

  const [showDebug, setShowDebug] = useState(false);
  const [cameras, setCameras] = useState<CameraDebugInfo[]>([]);

  useEffect(() => {
    const enumerate = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          }));
        setCameras(videoDevices);
      } catch {
        setCameras([]);
      }
    };
    enumerate();
    navigator.mediaDevices?.addEventListener("devicechange", enumerate);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", enumerate);
  }, []);

  const Toggle = ({ label, icon, active, onToggle, disabled }: {
    label: string; icon: React.ReactNode; active: boolean; onToggle: () => void; disabled?: boolean;
  }) => (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all border ${
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/20"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <Settings className="w-4 h-4 text-primary" />
        <span>Controls</span>
      </div>
      <div className="p-3 space-y-3">
        {/* Overlays */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Overlays</span>
          <div className="flex flex-wrap gap-2">
            <Toggle label="Bounding Boxes" icon={showBoundingBoxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} active={showBoundingBoxes} onToggle={() => setShowBoundingBoxes(!showBoundingBoxes)} />
            <Toggle label="Heatmap" icon={<Flame className="w-3 h-3" />} active={showHeatmap} onToggle={() => setShowHeatmap(!showHeatmap)} />
            <Toggle label="Alerts" icon={enableAlerts ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />} active={enableAlerts} onToggle={() => setEnableAlerts(!enableAlerts)} />
          </div>
        </div>

        {/* Threshold Slider */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Threshold Sensitivity: {thresholdLevel}
          </span>
          <Slider
            value={[thresholdLevel]}
            onValueChange={([v]) => setThresholdLevel(v)}
            min={10}
            max={200}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
            <span>Sensitive</span>
            <span>Coarse</span>
          </div>
        </div>

        {/* Mirror + Quality */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Camera Options</span>
          <div className="flex flex-wrap gap-2">
            <Toggle
              label={mirrorMode ? "Mirror ON" : "Mirror OFF"}
              icon={<FlipHorizontal className="w-3 h-3" />}
              active={mirrorMode}
              onToggle={() => setMirrorMode(!mirrorMode)}
            />
            <button
              onClick={() => setQualityMode(qualityMode === "hd" ? "sd" : "hd")}
              disabled={isLive}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all border ${
                qualityMode === "hd"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-secondary/50 text-muted-foreground border-border"
              } ${isLive ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Gauge className="w-3 h-3" />
              {qualityMode.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Video Input Mode */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Video Source</span>
          <div className="flex flex-wrap gap-1">
            {([
              { key: "live" as const, label: "Webcam", icon: <Monitor className="w-3 h-3" /> },
              { key: "cctv" as const, label: "CCTV/WiFi", icon: <Radio className="w-3 h-3" /> },
              { key: "upload" as const, label: "Upload", icon: <Upload className="w-3 h-3" /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setVideoMode(key)}
                disabled={isLive}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${
                  videoMode === key
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-secondary/30 text-muted-foreground border-border"
                } ${isLive ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          {videoMode === "cctv" && !isLive && (
            <input
              type="text"
              value={cctvUrl}
              onChange={(e) => setCctvUrl(e.target.value)}
              placeholder="rtsp:// or http:// stream URL"
              className="w-full px-2 py-1.5 rounded-md text-[10px] font-mono bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          )}
        </div>

        {/* Audio Mode */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Audio Source</span>
          <div className="flex gap-1">
            <button onClick={() => setAudioMode("live")} disabled={isRecording} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${audioMode === "live" ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary/30 text-muted-foreground border-border"} ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}>
              <Mic className="w-3 h-3" /> Live
            </button>
            <button onClick={() => setAudioMode("upload")} disabled={isRecording} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${audioMode === "upload" ? "bg-accent/15 text-accent border-accent/30" : "bg-secondary/30 text-muted-foreground border-border"} ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}>
              <FileAudio className="w-3 h-3" /> Upload
            </button>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Resolution</span>
          <div className="flex flex-wrap gap-1">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                disabled={isLive}
                className={`px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${
                  resolution === r.value
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-secondary/30 text-muted-foreground border-border"
                } ${isLive ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Simulation</span>
          <Toggle
            label={simulationMode ? "Simulation ON" : "Simulation OFF"}
            icon={<Monitor className="w-3 h-3" />}
            active={simulationMode}
            onToggle={() => setSimulationMode(!simulationMode)}
            disabled={isLive || isRecording}
          />
          {simulationMode && (
            <p className="text-[10px] font-mono text-accent">
              Using synthetic data — no camera/mic required
            </p>
          )}
        </div>

        {/* Debug Tools */}
        <div className="space-y-1.5">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors"
          >
            <Bug className="w-3 h-3" />
            Debug Tools
            <ChevronDown className={`w-3 h-3 transition-transform ${showDebug ? "rotate-180" : ""}`} />
          </button>
          {showDebug && (
            <div className="bg-secondary/30 border border-border rounded-md p-2 space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground">
                <span className="text-primary">Detected Cameras:</span> {cameras.length}
              </div>
              {cameras.map((cam, i) => (
                <div key={cam.deviceId} className="text-[9px] font-mono text-muted-foreground pl-2 border-l border-border">
                  <div className="text-foreground">Camera {i + 1}: {cam.label}</div>
                  <div className="text-muted-foreground truncate">ID: {cam.deviceId.slice(0, 20)}…</div>
                  <div>
                    Panel: {i === 0 ? "Main Feed" : i === 1 ? "Saliency" : i === 2 ? "Threshold" : "Low-Fi"}
                  </div>
                </div>
              ))}
              {cameras.length === 0 && (
                <div className="text-[9px] font-mono text-muted-foreground pl-2">
                  No cameras detected — grant permission first
                </div>
              )}
              <div className="text-[9px] font-mono text-muted-foreground">
                <span className="text-primary">Mode:</span> {cameras.length <= 1 ? "Clone (single camera)" : `Multi (${cameras.length} cameras)`}
              </div>
              <div className="text-[9px] font-mono text-muted-foreground">
                <span className="text-primary">Quality:</span> {qualityMode.toUpperCase()} • <span className="text-primary">Mirror:</span> {mirrorMode ? "ON" : "OFF"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
