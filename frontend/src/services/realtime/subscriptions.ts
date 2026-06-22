type Unsubscribe = () => void;

export function subscribeToInbox(
  _onUpdate: (data: unknown) => void
): Unsubscribe {
  return () => {};
}

export function subscribeToAlerts(
  _onUpdate: (data: unknown) => void
): Unsubscribe {
  return () => {};
}
