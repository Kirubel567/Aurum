type MessageHandler = (data: unknown) => void;

let connected = false;
const handlers: MessageHandler[] = [];

export function connect(): void {
  connected = true;
}

export function disconnect(): void {
  connected = false;
}

export function isConnected(): boolean {
  return connected;
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

export function emitMessage(data: unknown): void {
  handlers.forEach((h) => h(data));
}
