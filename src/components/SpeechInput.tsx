import { Mic, MicOff, Activity, Upload, X } from "lucide-react";
import { useRef, useEffect, useCallback, useState } from "react";
import { useDetectionContext } from "@/context/DetectionContext";

const SpeechInput = () => {
  const {
    isRecording, setIsRecording,
    currentVolume, setCurrentVolume,
    addSpeechEvent, addAlert,
    audioMode, enableAlerts,
  } = useDetectionContext();

  const [levels, setLevels] = useState<number[]>(Array(32).fill(0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const lastEventRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTimeStr = () => new Date().toLocaleTimeString("en-US", { hour12: false });

  const processAudio = useCallback((source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode, audioCtx: AudioContext) => {
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const arr = Array.from(dataArray);
      const normalized = arr.map((v) => v / 255);
      setLevels(normalized);

      const rms = Math.sqrt(arr.reduce((sum, v) => sum + (v / 255) ** 2, 0) / arr.length);
      const db = Math.max(0, Math.min(100, rms * 120));
      setCurrentVolume(db);

      const now = Date.now();
      if (db > 60 && now - lastEventRef.current > 4000) {
        lastEventRef.current = now;
        const event = {
          id: `speech-${now}`,
          time: getTimeStr(),
          volume: Math.round(db),
          label: db > 80 ? `Loud voice (${Math.round(db)} dB)` : `Speech detected (${Math.round(db)} dB)`,
          level: (db > 80 ? "critical" : "elevated") as "critical" | "elevated",
        };
        addSpeechEvent(event);

        if (enableAlerts && db > 80) {
          addAlert({
            id: `audio-alert-${now}`,
            type: "warning",
            message: `Loud audio detected (${Math.round(db)} dB)`,
            time: getTimeStr(),
          });
        }
      }

      animRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [setCurrentVolume, addSpeechEvent, addAlert, enableAlerts]);

  const startRecording = useCallback(async () => {
    try {
      if (audioMode === "live") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        processAudio(source, audioCtx);
      } else if (audioMode === "upload" && uploadedAudioUrl) {
        const audioEl = new Audio(uploadedAudioUrl);
        audioEl.loop = true;
        audioElRef.current = audioEl;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaElementSource(audioEl);
        source.connect(audioCtx.destination);
        processAudio(source, audioCtx);
        audioEl.play();
      }
      setIsRecording(true);
    } catch (err) {
      console.error("Audio access denied:", err);
    }
  }, [audioMode, uploadedAudioUrl, processAudio, setIsRecording]);

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsRecording(false);
    setCurrentVolume(0);
    setLevels(Array(32).fill(0));
  }, [setIsRecording, setCurrentVolume]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioElRef.current) audioElRef.current.pause();
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedAudioUrl(URL.createObjectURL(file));
    }
  };

  const { speechEvents } = useDetectionContext();

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Activity className="w-4 h-4 text-primary" />
        <span>Speech Signal</span>
        <div className="ml-auto flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <span className="status-dot bg-danger animate-pulse" />
              <span className="text-[10px] font-mono text-danger">REC</span>
            </div>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {Math.round(currentVolume)} dB
          </span>
        </div>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Waveform */}
        <div className="flex items-end justify-center gap-0.5 h-16 bg-background rounded-md px-2">
          {levels.map((level, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(2, level * 100)}%`,
                backgroundColor: isRecording
                  ? level > 0.7
                    ? "hsl(0, 70%, 55%)"
                    : level > 0.4
                    ? "hsl(38, 90%, 55%)"
                    : `hsl(185, 80%, ${40 + level * 30}%)`
                  : "hsl(220, 15%, 20%)",
              }}
            />
          ))}
        </div>

        {/* dB meter bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
            <span>0 dB</span>
            <span>100 dB</span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${currentVolume}%`,
                background: currentVolume > 80
                  ? "hsl(0, 70%, 55%)"
                  : currentVolume > 60
                  ? "hsl(38, 90%, 55%)"
                  : "hsl(185, 80%, 50%)",
              }}
            />
          </div>
        </div>

        {/* Speech events */}
        <div className="flex-1 overflow-auto space-y-1.5 min-h-0">
          {speechEvents.length === 0 && (
            <div className="text-xs text-muted-foreground font-mono text-center py-4">
              No speech events
            </div>
          )}
          {speechEvents.slice(0, 5).map((evt) => (
            <div
              key={evt.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                evt.level === "critical"
                  ? "bg-danger/10 border border-danger/20"
                  : evt.level === "elevated"
                  ? "bg-accent/10 border border-accent/20"
                  : "bg-secondary/50"
              }`}
            >
              <span
                className={`text-[10px] font-mono ${
                  evt.level === "critical" ? "text-danger" : evt.level === "elevated" ? "text-accent" : "text-muted-foreground"
                }`}
              >
                EVENT
              </span>
              <span className="text-foreground">{evt.label}</span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">{evt.time}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={audioMode === "upload" && !uploadedAudioUrl}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isRecording
                ? "bg-danger/20 text-danger hover:bg-danger/30 glow-danger"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
            {isRecording ? "Stop" : "Record"}
          </button>

          {audioMode === "upload" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/wav,audio/mp3,audio/mpeg,audio/*"
                className="hidden"
                onChange={handleAudioUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-3 h-3" />
                {uploadedAudioUrl ? "Change" : "Upload"}
              </button>
              {uploadedAudioUrl && !isRecording && (
                <button onClick={() => setUploadedAudioUrl(null)} className="text-muted-foreground hover:text-danger transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechInput;
