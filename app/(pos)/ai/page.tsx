"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import { AIChat } from "@/components/pos/ai-chat";
import { AIForecast } from "@/components/pos/ai-forecast";
import { AIMenuOptimization } from "@/components/pos/ai-menu-optimization";

type Tab = "chat" | "forecast" | "optimization";

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "AI Assistant" },
  { id: "forecast", label: "Πρόβλεψη Ζήτησης" },
  { id: "optimization", label: "Βελτιστοποίηση Μενού" },
];

export default function AIPage() {
  const [selectedTab, setSelectedTab] = useState<Tab>("chat");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chat, πρόβλεψη ζήτησης & βελτιστοποίηση μενού
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={[
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              selectedTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {selectedTab === "chat" && <AIChat />}
      {selectedTab === "forecast" && <AIForecast />}
      {selectedTab === "optimization" && <AIMenuOptimization />}
    </div>
  );
}
