import { log } from "./log";
// Phone alerts. PUSH_DRIVER=expo sends through Expo's free push service (works for iOS and
// Android apps built with Expo). PUSH_DRIVER=log (default while testing) only records them.
import { env } from "../env";

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Messages "sent" with the log driver — tests and local runs look here. */
export const pushOutbox: PushMessage[] = [];

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPush(messages: PushMessage[]): Promise<{ sent: number; driver: string }> {
  const driver = process.env.PUSH_DRIVER ?? (env.isProduction ? "expo" : "log");
  if (!messages.length) return { sent: 0, driver };

  if (driver === "log") {
    pushOutbox.push(...messages);
    if (process.env.NODE_ENV !== "test") console.log(`[push] ${messages.length} alert(s): ${messages[0].title}`);
    return { sent: messages.length, driver };
  }

  // Expo accepts up to 100 messages per request.
  // NOTE: not yet tried against the live Expo service — check with a real phone before launch.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ ...m, sound: "default" }));
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else log("ERROR", { module: "push", code: "expo_rejected", status: res.status });
    } catch (err) {
      // An alert failing must never break the announcement itself
      log("ERROR", { module: "push", code: "expo_unreachable" }, err instanceof Error ? err.stack : String(err));
    }
  }
  return { sent, driver };
}
