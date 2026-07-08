import { ChatWidget } from "@/components/chat/ChatWidget";
import { ScoreDashboard } from "@/components/score/ScoreDashboard";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <ScoreDashboard />
      <ChatWidget />
    </main>
  );
}
