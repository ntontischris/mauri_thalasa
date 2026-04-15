"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  BarChart3,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Γεια σας! Είμαι ο AI βοηθός του EatFlow. Σύντομα θα μπορώ να σας βοηθήσω με αναλύσεις, προβλέψεις ζήτησης, και βελτιστοποίηση μενού. Η λειτουργία αυτή απαιτεί σύνδεση με OpenAI API.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "Η λειτουργία AI δεν είναι ακόμα ενεργοποιημένη. Πηγαίνετε στις Ρυθμίσεις για να προσθέσετε το OpenAI API key.",
      },
    ]);
    setInput("");
  };

  const capabilities = [
    {
      icon: TrendingUp,
      label: "Πρόβλεψη Ζήτησης",
      desc: "Πόσα πιάτα θα χρειαστούν αύριο",
    },
    {
      icon: UtensilsCrossed,
      label: "Βελτιστοποίηση Μενού",
      desc: "Ποια πιάτα αποδίδουν καλύτερα",
    },
    {
      icon: BarChart3,
      label: "Ανάλυση Πωλήσεων",
      desc: "Trends και patterns στα δεδομένα",
    },
    {
      icon: Sparkles,
      label: "Προτάσεις",
      desc: "Ιδέες για νέα πιάτα και τιμολόγηση",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Chat */}
      <Card className="lg:col-span-2">
        <CardContent className="flex h-[calc(100vh-14rem)] flex-col p-0">
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <Bot className="mb-1 size-4 opacity-50" />
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ρωτήστε κάτι..."
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button size="icon" onClick={handleSend}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Capabilities */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Δυνατότητες AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capabilities.map((cap) => (
              <div
                key={cap.label}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <cap.icon className="mt-0.5 size-5 text-primary opacity-60" />
                <div>
                  <p className="text-sm font-medium">{cap.label}</p>
                  <p className="text-xs text-muted-foreground">{cap.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/50">
          <CardContent className="p-3 text-sm text-amber-600">
            <Badge variant="outline" className="mb-2 text-amber-600">
              Απαιτείται
            </Badge>
            <p>
              Προσθέστε OpenAI API key στις Ρυθμίσεις για να ενεργοποιήσετε τις
              AI λειτουργίες.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
