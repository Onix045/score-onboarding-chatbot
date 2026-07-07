import { ChatWidget } from "@/components/chat/ChatWidget";
import { ScoreDashboard } from "@/components/score/ScoreDashboard";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <ScoreDashboard />
      <ChatWidget />
    </main>
  );
}
