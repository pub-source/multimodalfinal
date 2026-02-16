import { Settings, Eye, EyeOff, Flame, Bell, BellOff, Monitor, Upload, Mic, FileAudio } from "lucide-react";
import { useDetectionContext } from "@/context/DetectionContext";

const ControlPanel = () => {
  const {
    showBoundingBoxes, setShowBoundingBoxes,
    showHeatmap, setShowHeatmap,
    enableAlerts, setEnableAlerts,
    simulationMode, setSimulationMode,
    videoMode, setVideoMode,
    audioMode, setAudioMode,
    isLive, isRecording,
  } = useDetectionContext();

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

  const ModeSwitch = ({ label, mode, onSwitch, liveIcon, uploadIcon, disabled }: {
    label: string; mode: "live" | "upload"; onSwitch: (m: "live" | "upload") => void;
    liveIcon: React.ReactNode; uploadIcon: React.ReactNode; disabled?: boolean;
  }) => (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-mono text-muted-foreground mr-1">{label}</span>
      <button
        onClick={() => onSwitch("live")}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded-l-md text-[10px] font-mono border transition-all ${
          mode === "live"
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-secondary/30 text-muted-foreground border-border"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {liveIcon} Live
      </button>
      <button
        onClick={() => onSwitch("upload")}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded-r-md text-[10px] font-mono border-t border-b border-r transition-all ${
          mode === "upload"
            ? "bg-accent/15 text-accent border-accent/30"
            : "bg-secondary/30 text-muted-foreground border-border"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {uploadIcon} Upload
      </button>
    </div>
  );

  return (
    <div className="panel flex flex-col">
      <div className="panel-header">
        <Settings className="w-4 h-4 text-primary" />
        <span>Controls</span>
      </div>
      <div className="p-3 space-y-3">
        {/* Toggles */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Overlays</span>
          <div className="flex flex-wrap gap-2">
            <Toggle
              label="Bounding Boxes"
              icon={showBoundingBoxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              active={showBoundingBoxes}
              onToggle={() => setShowBoundingBoxes(!showBoundingBoxes)}
            />
            <Toggle
              label="Heatmap"
              icon={<Flame className="w-3 h-3" />}
              active={showHeatmap}
              onToggle={() => setShowHeatmap(!showHeatmap)}
            />
            <Toggle
              label="Alerts"
              icon={enableAlerts ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              active={enableAlerts}
              onToggle={() => setEnableAlerts(!enableAlerts)}
            />
          </div>
        </div>

        {/* Input modes */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Input Mode</span>
          <div className="flex flex-wrap gap-3">
            <ModeSwitch
              label="Video"
              mode={videoMode}
              onSwitch={setVideoMode}
              liveIcon={<Monitor className="w-3 h-3" />}
              uploadIcon={<Upload className="w-3 h-3" />}
              disabled={isLive}
            />
            <ModeSwitch
              label="Audio"
              mode={audioMode}
              onSwitch={setAudioMode}
              liveIcon={<Mic className="w-3 h-3" />}
              uploadIcon={<FileAudio className="w-3 h-3" />}
              disabled={isRecording}
            />
          </div>
        </div>

        {/* Simulation mode */}
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
      </div>
    </div>
  );
};

export default ControlPanel;
