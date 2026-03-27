"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePOS } from "@/lib/pos-context";
import { callOpenAI, buildSystemPrompt } from "@/lib/ai-openai";

// ─── Component ────────────────────────────────────────────────────────────

export function AISettings() {
  const { state, dispatch } = usePOS();
  const [isTesting, setIsTesting] = useState(false);

  const { enabled, openaiKey } = state.aiSettings;

  const handleToggle = (checked: boolean) => {
    dispatch({
      type: "UPDATE_AI_SETTINGS",
      payload: { ...state.aiSettings, enabled: checked },
    });
  };

  const handleKeyChange = (value: string) => {
    dispatch({
      type: "UPDATE_AI_SETTINGS",
      payload: { ...state.aiSettings, openaiKey: value },
    });
  };

  const handleTestConnection = async () => {
    if (!openaiKey) {
      toast.error("Εισάγετε πρώτα ένα API key");
      return;
    }

    setIsTesting(true);
    try {
      const systemPrompt = "You are a test assistant. Reply with: OK";
      const response = await callOpenAI(openaiKey, systemPrompt, "Test");

      if (response.startsWith("Σφάλμα")) {
        toast.error(response);
      } else {
        toast.success("Σύνδεση επιτυχής! Το OpenAI API λειτουργεί.");
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-5" />
          AI Assistant
        </CardTitle>
        <CardDescription>
          Ρυθμίσεις AI βοηθού και OpenAI σύνδεσης
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ενεργοποίηση OpenAI</Label>
            <p className="text-sm text-muted-foreground">
              Χρήση OpenAI API για πιο ακριβείς απαντήσεις
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>

        {/* API Key input */}
        <div className="space-y-2">
          <Label htmlFor="openai-key">API Key</Label>
          <Input
            id="openai-key"
            type="password"
            placeholder="sk-..."
            value={openaiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            disabled={!enabled}
          />
        </div>

        {/* Model info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Μοντέλο</span>
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
            gpt-4o-mini
          </span>
        </div>

        {/* Test button */}
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={!enabled || !openaiKey || isTesting}
          className="w-full"
        >
          {isTesting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Δοκιμή...
            </>
          ) : (
            "Δοκιμή Σύνδεσης"
          )}
        </Button>

        {/* Info note */}
        <p className="text-xs text-muted-foreground">
          Χωρίς API key λειτουργεί με ενσωματωμένες απαντήσεις.
        </p>
      </CardContent>
    </Card>
  );
}
