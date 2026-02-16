import { Eye, Wifi } from "lucide-react";
import CameraFeed from "@/components/CameraFeed";
import DetectionResults from "@/components/DetectionResults";
import SaliencyMap from "@/components/SaliencyMap";
import SpeechInput from "@/components/SpeechInput";
import AlertsFeed from "@/components/AlertsFeed";
import LogsHistory from "@/components/LogsHistory";
import ControlPanel from "@/components/ControlPanel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { DetectionProvider } from "@/context/DetectionContext";
import { useSimulation } from "@/hooks/useSimulation";
import { usePersistence } from "@/hooks/usePersistence";

const DashboardContent = () => {
  useSimulation();
  usePersistence();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Eye className="w-5 h-5" />
          <h1 className="text-sm font-semibold tracking-wide uppercase">
            Multimodal Saliency Detection
          </h1>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
          v2.0
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-success text-xs font-mono">
            <Wifi className="w-3.5 h-3.5" />
            System Online
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-min">
        {/* Left: Video + Saliency */}
        <div className="lg:col-span-2 space-y-4">
          <CameraFeed />
          <SaliencyMap />
        </div>

        {/* Right: Audio + Alerts + Controls */}
        <div className="lg:col-span-2 space-y-4">
          <ControlPanel />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SpeechInput />
            <DetectionResults />
          </div>
          <AlertsFeed />
        </div>

        {/* Bottom: Analytics + Logs */}
        <div className="lg:col-span-4">
          <AnalyticsCharts />
        </div>
        <div className="lg:col-span-4">
          <LogsHistory />
        </div>
      </main>
    </div>
  );
};

const Index = () => {
  return (
    <DetectionProvider>
      <DashboardContent />
    </DetectionProvider>
  );
};

export default Index;
