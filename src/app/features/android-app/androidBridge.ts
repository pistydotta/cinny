// window.blazeroomAndroid, which only the Android app injects, and only for this site's origin.
export type NativeBridge = {
  postMessage: (message: string) => void;
  addEventListener: (type: 'message', listener: (evt: { data: unknown }) => void) => void;
};

export type BridgeMessage = { type: string; [key: string]: unknown };
type Handler = (message: BridgeMessage) => void;

const parse = (data: unknown): BridgeMessage | undefined => {
  if (typeof data !== 'string') return undefined;
  try {
    const message = JSON.parse(data);
    return typeof message?.type === 'string' ? message : undefined;
  } catch {
    return undefined;
  }
};

// Everything here does nothing outside the app, so callers needn't check.
export const createAndroidBridge = (getNative: () => NativeBridge | undefined) => {
  const handlers = new Map<string, Set<Handler>>();
  let listening = false;

  const listen = () => {
    const native = getNative();
    if (!native || listening) return;
    listening = true;
    native.addEventListener('message', ({ data }) => {
      const message = parse(data);
      if (message) handlers.get(message.type)?.forEach((handler) => handler(message));
    });
  };

  return {
    available: (): boolean => !!getNative(),
    send: (message: BridgeMessage): void => {
      getNative()?.postMessage(JSON.stringify(message));
    },
    on: (type: string, handler: Handler): (() => void) => {
      listen();
      const forType = handlers.get(type) ?? new Set<Handler>();
      handlers.set(type, forType);
      forType.add(handler);
      return () => {
        forType.delete(handler);
      };
    },
  };
};

export const androidBridge = createAndroidBridge(
  () => (window as unknown as { blazeroomAndroid?: NativeBridge }).blazeroomAndroid
);
