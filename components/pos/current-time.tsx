"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function CurrentTime() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("el-GR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setDate(
        now.toLocaleDateString("el-GR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="size-4" />
      <span className="font-medium text-foreground">{time}</span>
      <span className="hidden sm:inline">&bull;</span>
      <span className="hidden sm:inline">{date}</span>
    </div>
  );
}
