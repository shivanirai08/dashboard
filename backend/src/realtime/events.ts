export type RealtimeEventType =
  | "booking.created"
  | "booking.updated"
  | "customer.created"
  | "mechanic.created"
  | "ping";

export type RealtimeEvent = {
  type: RealtimeEventType;
  at: string;
  message: string;
  data?: Record<string, unknown>;
};

export function makeEvent(
  type: Exclude<RealtimeEventType, "ping">,
  message: string,
  data?: Record<string, unknown>,
): RealtimeEvent {
  return {
    type,
    at: new Date().toISOString(),
    message,
    data,
  };
}
