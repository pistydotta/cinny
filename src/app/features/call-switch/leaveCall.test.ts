import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementWidgetActions } from '../../plugins/call/types';
import { LeavableCall, leaveCall } from './leaveCall';

const fakeCall = (joined: boolean, hangup: () => Promise<unknown> = () => Promise.resolve()) => {
  const listeners = new Map<string, Set<() => void>>();
  const call: LeavableCall & { emit: (type: string) => void; listening: () => number } = {
    joined,
    hangup: vi.fn(hangup),
    listenAction: (type, callback) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(callback);
      return () => listeners.get(type)?.delete(callback);
    },
    emit: (type) => listeners.get(type)?.forEach((cb) => cb()),
    listening: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return call;
};

const settled = async (promise: Promise<void>) => {
  let done = false;
  promise.then(() => {
    done = true;
  });
  await vi.advanceTimersByTimeAsync(0);
  return done;
};

describe('leaveCall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("doesn't hang up a call that was never joined", async () => {
    const call = fakeCall(false);
    expect(await settled(leaveCall(call))).toBe(true);
    expect(call.hangup).not.toHaveBeenCalled();
  });

  it('waits until Element Call says it has left', async () => {
    const call = fakeCall(true);
    const left = leaveCall(call);
    expect(call.hangup).toHaveBeenCalledOnce();
    expect(await settled(left)).toBe(false);

    call.emit(ElementWidgetActions.HangupCall);
    expect(await settled(left)).toBe(true);
    expect(call.listening()).toBe(0);
  });

  it('also takes the close action as left', async () => {
    const call = fakeCall(true);
    const left = leaveCall(call);
    call.emit(ElementWidgetActions.Close);
    expect(await settled(left)).toBe(true);
  });

  it('gives up waiting after the timeout', async () => {
    const call = fakeCall(true);
    const left = leaveCall(call, 1000);
    await vi.advanceTimersByTimeAsync(999);
    expect(await settled(left)).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled(left)).toBe(true);
    expect(call.listening()).toBe(0);
  });

  it("doesn't wait when the hangup can't be sent", async () => {
    const call = fakeCall(true, () => Promise.reject(new Error('widget gone')));
    expect(await settled(leaveCall(call))).toBe(true);
  });
});
