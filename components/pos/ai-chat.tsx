"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAI } from "@/hooks/use-ai";

// ─── Constants ────────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "Πόσα πούλησα σήμερα;",
  "Τι πουλάει;",
  "Food cost",
  "Πρόβλεψη αύριο",
  "Τι να αλλάξω;",
];

const WELCOME_MESSAGE =
  "Γεια! Είμαι ο AI βοηθός του EatFlow. Ρώτα με ό,τι θέλεις για το εστιατόριό σου!";

// ─── Helpers ──────────────────────────────────────────────────────────────

function renderFormattedText(text: string) {
  // Split on **bold** markers and render with <strong>
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-semibold">
          {part}
        </strong>
      );
    }
    // Handle newlines
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export function AIChat() {
  const { sendMessage, clearChat, chatHistory, aiSettings } = useAI();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    try {
      await sendMessage(text);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = async (question: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await sendMessage(question);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmpty = chatHistory.length === 0;
  const modeLabel =
    aiSettings.enabled && aiSettings.openaiKey ? "OpenAI" : "Mock Mode";

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] max-h-[700px]">
      {/* Mode badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="text-xs">
          {modeLabel}
        </Badge>
        {chatHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-xs text-muted-foreground"
          >
            <Trash2 className="size-3 mr-1" />
            Καθαρισμός
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <div className="text-3xl">🤖</div>
            </div>
            <p className="text-muted-foreground text-sm max-w-md">
              {WELCOME_MESSAGE}
            </p>

            {/* Suggested question chips */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleChipClick(q)}
                  disabled={isLoading}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {renderFormattedText(msg.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                <div className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                <div className="size-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips when chat has messages */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-1.5 pt-3 pb-1">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleChipClick(q)}
              disabled={isLoading}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ρώτα κάτι..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          size="icon"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
