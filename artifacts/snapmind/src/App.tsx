import {} from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AgentCore } from "./components/AgentCore";
import { ChatPanel } from "./components/ChatPanel";
import { SnapBar } from "./components/SnapBar";
import { FeedPreview } from "./components/FeedPreview";
import { WorldviewBrainMap } from "./components/WorldviewBrainMap";
import { loadDemoSeed } from "./demo/demoScenario";
import { useSnapMindStore } from "./state/useSnapMindStore";

const queryClient = new QueryClient();

function Home() {
  const { agentProfile } = useSnapMindStore();

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden relative">
      <div className="flex-none pt-8 pb-4 z-10">
        <AgentCore />
        <FeedPreview />
      </div>
      
      <div className="flex-1 min-h-0 z-10 relative">
        <ChatPanel />
      </div>

      <div className="z-20">
        <SnapBar />
      </div>

      <WorldviewBrainMap />
      
      {agentProfile?.formationStage === "empty" && (
        <button 
          onClick={loadDemoSeed}
          className="absolute top-4 right-4 z-10 text-xs px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          데모 데이터 추가
        </button>
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;