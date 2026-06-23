const CHANNEL_NAME = "aurum-deposit-status";

export function broadcastDepositStatusChange(): void {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "refresh", at: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel may be unavailable in some embedded contexts.
  }
}

export function subscribeDepositStatusChanges(
  onRefresh: () => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => onRefresh();
    return () => channel.close();
  } catch {
    return () => undefined;
  }
}
