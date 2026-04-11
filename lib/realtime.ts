// EatFlow POS - Real-time Sync Infrastructure
// Provides real-time synchronization between multiple tablets/devices
// using Supabase Realtime channels.
//
// In production: connects to Supabase Realtime.
// For now: provides the API shape + BroadcastChannel for local multi-tab sync.

export type RealtimeEvent =
  | { type: "order:created"; payload: { orderId: string; tableId: string } }
  | { type: "order:updated"; payload: { orderId: string } }
  | { type: "order:completed"; payload: { orderId: string; tableId: string } }
  | { type: "item:status_changed"; payload: { orderId: string; itemId: string; status: string } }
  | { type: "table:status_changed"; payload: { tableId: string; status: string } }
  | { type: "reservation:created"; payload: { reservationId: string } }
  | { type: "reservation:updated"; payload: { reservationId: string; status: string } }
  | { type: "waitlist:updated"; payload: { waitlistId: string } }
  | { type: "stock:low"; payload: { ingredientId: string; name: string; stock: number } }
  | { type: "kitchen:rush"; payload: { orderId: string; tableNumber: number } }
  | { type: "feedback:received"; payload: { rating: number; orderId: string } };

type EventHandler = (event: RealtimeEvent) => void;

class RealtimeSync {
  private handlers: Set<EventHandler> = new Set();
  private channel: BroadcastChannel | null = null;

  connect() {
    // Use BroadcastChannel for multi-tab sync (works offline)
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("eatflow-realtime");
      this.channel.onmessage = (event) => {
        this.notifyHandlers(event.data);
      };
    }

    // In production, connect to Supabase Realtime:
    // const supabase = createClient(url, key);
    // supabase.channel('pos-events')
    //   .on('broadcast', { event: '*' }, (payload) => this.notifyHandlers(payload))
    //   .subscribe();
  }

  disconnect() {
    this.channel?.close();
    this.channel = null;
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  broadcast(event: RealtimeEvent) {
    // Send to other tabs
    this.channel?.postMessage(event);
    // Also notify local handlers
    this.notifyHandlers(event);
  }

  private notifyHandlers(event: RealtimeEvent) {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error("Realtime handler error:", err);
      }
    }
  }
}

// Singleton instance
export const realtime = new RealtimeSync();

// React hook for subscribing to realtime events
import { useEffect } from "react";

export function useRealtime(handler: EventHandler) {
  useEffect(() => {
    realtime.connect();
    const unsubscribe = realtime.subscribe(handler);
    return () => {
      unsubscribe();
    };
  }, [handler]);
}

// Kitchen-specific hook: only listen to kitchen-relevant events
export function useKitchenRealtime(
  onOrderCreated?: (orderId: string) => void,
  onItemStatusChanged?: (orderId: string, itemId: string, status: string) => void,
  onRush?: (orderId: string, tableNumber: number) => void,
) {
  useRealtime((event) => {
    switch (event.type) {
      case "order:created":
        onOrderCreated?.(event.payload.orderId);
        break;
      case "item:status_changed":
        onItemStatusChanged?.(event.payload.orderId, event.payload.itemId, event.payload.status);
        break;
      case "kitchen:rush":
        onRush?.(event.payload.orderId, event.payload.tableNumber);
        break;
    }
  });
}
