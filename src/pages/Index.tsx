import { Eye, Wifi } from "lucide-react";
import CameraFeed from "@/components/CameraFeed";
import DetectionResults from "@/components/DetectionResults";
import SaliencyMap from "@/components/SaliencyMap";
import SaliencyOutput from "@/components/SaliencyOutput";
import ThresholdView from "@/components/ThresholdView";
import LowFiSaliency from "@/components/LowFiSaliency";
import SpeechInput from "@/components/SpeechInput";
import AlertsFeed from "@/components/AlertsFeed";
import LogsHistory from "@/components/LogsHistory";
import ControlPanel from "@/components/ControlPanel";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import ResearchMode from "@/components/ResearchMode";
import { DetectionProvider } from "@/context/DetectionContext";
import { useSimulation } from "@/hooks/useSimulation";
import { usePersistence } from "@/hooks/usePersistence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col">
        <div className="px-6 pt-2">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="research">Research Mode</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="flex-1">
          <main className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-min">
            {/* 2x2 camera grid */}
            <div className="lg:col-span-2">
              <CameraFeed />
            </div>
            <div className="lg:col-span-2">
              <SaliencyOutput />
            </div>
            <div className="lg:col-span-2">
              <ThresholdView />
            </div>
            <div className="lg:col-span-2">
              <LowFiSaliency />
            </div>

            <div className="lg:col-span-2">
              <SaliencyMap />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <ControlPanel />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SpeechInput />
                <DetectionResults />
              </div>
              <AlertsFeed />
            </div>
            <div className="lg:col-span-4">
              <AnalyticsCharts />
            </div>
            <div className="lg:col-span-4">
              <LogsHistory />
            </div>
          </main>
        </TabsContent>

        <TabsContent value="research" className="flex-1 p-4">
          <ResearchMode />
        </TabsContent>
      </Tabs>
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
