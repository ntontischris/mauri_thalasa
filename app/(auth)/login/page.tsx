"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ensureStaffAccount } from "@/lib/actions/auth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleClear = () => setPin("");
  const handleBackspace = () => setPin((prev) => prev.slice(0, -1));

  const handleSubmit = async (pinValue: string) => {
    if (pinValue.length !== 4) return;
    setLoading(true);

    try {
      const { data: staff, error: lookupError } = await supabase
        .from("staff_members")
        .select("id, name, role, pin")
        .eq("is_active", true);

      if (lookupError) {
        toast.error("Σφάλμα σύνδεσης");
        setPin("");
        setLoading(false);
        return;
      }

      const member = staff?.find((s) => s.pin === pinValue);

      if (!member) {
        toast.error("Λάθος PIN");
        setPin("");
        setLoading(false);
        return;
      }

      const email = `${member.id}@eatflow.local`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pinValue,
      });

      if (signInError) {
        // Create auth account via admin API (auto-confirmed, no email needed)
        const createResult = await ensureStaffAccount(
          member.id,
          member.name,
          member.role,
          pinValue,
        );

        if (!createResult.success) {
          toast.error("Σφάλμα δημιουργίας λογαριασμού");
          setPin("");
          setLoading(false);
          return;
        }

        // Retry sign in after account creation
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password: pinValue,
        });

        if (retryError) {
          toast.error("Σφάλμα σύνδεσης");
          setPin("");
          setLoading(false);
          return;
        }
      }

      toast.success(`Καλώς ήρθες, ${member.name}!`);
      router.push("/tables");
      router.refresh();
    } catch {
      toast.error("Σφάλμα σύνδεσης");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"];

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">EatFlow POS</CardTitle>
          <p className="text-sm text-muted-foreground">Εισάγετε το PIN σας</p>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  i < pin.length
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {digits.map((digit) => {
              if (digit === "C") {
                return (
                  <Button
                    key="clear"
                    variant="ghost"
                    className="h-14 text-lg"
                    onClick={handleClear}
                    disabled={loading}
                  >
                    C
                  </Button>
                );
              }
              if (digit === "←") {
                return (
                  <Button
                    key="back"
                    variant="ghost"
                    className="h-14 text-lg"
                    onClick={handleBackspace}
                    disabled={loading}
                  >
                    ←
                  </Button>
                );
              }
              return (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-14 text-xl font-semibold"
                  onClick={() => handlePinDigit(digit)}
                  disabled={loading}
                >
                  {digit}
                </Button>
              );
            })}
          </div>

          {loading && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Σύνδεση...
            </p>
          )}
        </CardContent>
      </Card>
      <Toaster position="top-right" richColors />
    </>
  );
}
