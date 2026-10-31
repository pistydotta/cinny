import { ElementWidgetActions } from '../../plugins/call/types';

// Element Call answers our hangup at once, then sends its own hangup when it has really left.
export const LEAVE_TIMEOUT_MS = 5000;

export type LeavableCall = {
  joined: boolean;
  hangup(): Promise<unknown>;
  listenAction(type: string, callback: () => void): () => void;
};

// Resolves once the call has been left, or after the timeout: the next call starts either way.
export const leaveCall = (call: LeavableCall, timeoutMs = LEAVE_TIMEOUT_MS): Promise<void> => {
  if (!call.joined) return Promise.resolve();

  return new Promise((resolve) => {
    const offs: Array<() => void> = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
      resolve();
    };
    offs.push(call.listenAction(ElementWidgetActions.HangupCall, done));
    offs.push(call.listenAction(ElementWidgetActions.Close, done));
    timer = setTimeout(done, timeoutMs);
    call.hangup().catch(done);
  });
};
