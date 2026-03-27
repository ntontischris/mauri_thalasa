"use client";

import { useState, useCallback } from "react";
import { Delete } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/hooks/use-staff";
import { cn } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

interface PinLoginProps {
  onLogin: (staff: StaffMember) => void;
}

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["backspace", "0", "enter"],
];

export function PinLogin({ onLogin }: PinLoginProps) {
  const { login } = useStaff();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      setError(false);
      if (pin.length >= 4) return;
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit on 4 digits
      if (newPin.length === 4) {
        const member = login(newPin);
        if (member) {
          onLogin(member);
          setPin("");
        } else {
          triggerError();
        }
      }
    },
    [pin, login, onLogin],
  );

  const handleBackspace = useCallback(() => {
    setError(false);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleEnter = useCallback(() => {
    if (pin.length === 0) return;
    const member = login(pin);
    if (member) {
      onLogin(member);
      setPin("");
    } else {
      triggerError();
    }
  }, [pin, login, onLogin]);

  const triggerError = () => {
    setError(true);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
    }, 600);
  };

  const handleKeyPress = (key: string) => {
    if (key === "backspace") {
      handleBackspace();
    } else if (key === "enter") {
      handleEnter();
    } else {
      handleDigit(key);
    }
  };

  return (
    <Card className="w-full max-w-xs mx-auto">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-lg">Σύνδεση PIN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PIN Display */}
        <div
          className={cn(
            "flex items-center justify-center gap-3 py-3",
            isShaking && "animate-shake",
          )}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "size-4 rounded-full border-2 transition-colors",
                i < pin.length
                  ? error
                    ? "bg-destructive border-destructive"
                    : "bg-primary border-primary"
                  : "border-muted-foreground/30",
              )}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-center text-xs text-destructive font-medium">
            Λάθος PIN
          </p>
        )}

        {/* Keypad */}
        <div className="grid gap-2">
          {KEYPAD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-2">
              {row.map((key) => {
                if (key === "backspace") {
                  return (
                    <Button
                      key={key}
                      variant="ghost"
                      className="h-12 text-lg"
                      onClick={() => handleKeyPress(key)}
                    >
                      <Delete className="size-5" />
                    </Button>
                  );
                }
                if (key === "enter") {
                  return (
                    <Button
                      key={key}
                      variant="default"
                      className="h-12 text-sm font-medium"
                      onClick={() => handleKeyPress(key)}
                      disabled={pin.length === 0}
                    >
                      OK
                    </Button>
                  );
                }
                return (
                  <Button
                    key={key}
                    variant="outline"
                    className="h-12 text-lg font-medium"
                    onClick={() => handleKeyPress(key)}
                  >
                    {key}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
