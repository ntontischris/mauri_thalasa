"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  UtensilsCrossed,
  Star,
  Check,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Public page - customer visits after their meal
// URL: /feedback?order=xxx&table=5

const ASPECTS = [
  { id: "food", label: "Φαγητό", emoji: "🍽️" },
  { id: "service", label: "Εξυπηρέτηση", emoji: "👨‍🍳" },
  { id: "ambiance", label: "Ατμόσφαιρα", emoji: "✨" },
  { id: "value", label: "Σχέση ποιότητας/τιμής", emoji: "💰" },
];

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const tableNumber = searchParams.get("table");

  const [overallRating, setOverallRating] = useState(0);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = () => {
    if (overallRating === 0) return;
    // In production: supabase.from('feedback').insert(...)
    setSubmitted(true);
  };

  const setAspectRating = (aspectId: string, rating: number) => {
    setAspectRatings((prev) => ({ ...prev, [aspectId]: rating }));
  };

  if (submitted) {
    const isPositive = overallRating >= 4;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Ευχαριστούμε πολύ!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Η γνώμη σας μας βοηθά να γίνουμε καλύτεροι.
            </p>

            {/* Google Review prompt for positive feedback */}
            {isPositive && (
              <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium">
                  Χαρήκαμε που σας άρεσε η εμπειρία!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Θα θέλατε να μοιραστείτε τη γνώμη σας και στο Google;
                </p>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    // In production: actual Google Review link
                    window.open("https://www.google.com/maps", "_blank");
                  }}
                >
                  <Star className="mr-2 size-4 text-amber-500" />
                  Αξιολογήστε μας στο Google
                  <ExternalLink className="ml-2 size-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <UtensilsCrossed className="size-6 text-primary" />
          <h1 className="text-xl font-bold">Μαύρη Θάλασσα</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Πώς ήταν η εμπειρία σας;
        </p>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 p-4">
        {/* Overall Rating */}
        <Card className="mb-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-lg font-semibold">Συνολική Εντύπωση</h2>
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setOverallRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      "size-10",
                      (hoverRating || overallRating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
            {overallRating > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {overallRating === 5
                  ? "Εξαιρετικά!"
                  : overallRating === 4
                    ? "Πολύ καλά!"
                    : overallRating === 3
                      ? "Ικανοποιητικά"
                      : overallRating === 2
                        ? "Μέτρια"
                        : "Απογοητευτικά"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Aspect ratings */}
        {overallRating > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <h3 className="mb-3 text-sm font-semibold">Βαθμολογήστε αναλυτικά</h3>
              <div className="space-y-4">
                {ASPECTS.map((aspect) => (
                  <div key={aspect.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span>{aspect.emoji}</span>
                      {aspect.label}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setAspectRating(aspect.id, star)}
                        >
                          <Star
                            className={cn(
                              "size-5",
                              (aspectRatings[aspect.id] ?? 0) >= star
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/20",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comment */}
        {overallRating > 0 && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" />
                Σχόλια (προαιρετικά)
              </h3>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Πείτε μας τι σας άρεσε ή τι μπορούμε να βελτιώσουμε..."
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {overallRating > 0 && (
          <Button className="w-full" size="lg" onClick={handleSubmit}>
            Υποβολή Αξιολόγησης
          </Button>
        )}
      </div>

      <footer className="border-t bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        Powered by EatFlow POS
      </footer>
    </div>
  );
}
