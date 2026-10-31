import { describe, expect, it, vi } from 'vitest';
import { pushSupport } from '../push/pushApi';
import {
  ANDROID_PUSH_APP_ID,
  androidPusher,
  callStateMessage,
  isAndroidApp,
  pendingCallRoom,
  shouldRegister,
} from './androidApp';
import { createAndroidBridge, NativeBridge } from './androidBridge';

const fakeNative = () => {
  const listeners: ((evt: { data: unknown }) => void)[] = [];
  const postMessage = vi.fn();
  const native: NativeBridge = {
    postMessage,
    addEventListener: (_type, listener) => listeners.push(listener),
  };
  return { native, postMessage, deliver: (data: unknown) => listeners.forEach((l) => l({ data })) };
};

describe('isAndroidApp', () => {
  it('recognizes the app', () => {
    expect(isAndroidApp('Mozilla/5.0 ... BlazeroomAndroid/1')).toBe(true);
    expect(isAndroidApp('Mozilla/5.0 ... Chrome/130')).toBe(false);
  });
});

describe('androidPusher', () => {
  it('builds the pusher', () => {
    const pusher = androidPusher('tok', 'https://matrix.x/_matrix/push/v1/notify', 'pt');
    expect(pusher.app_id).toBe('br.com.blazeroom.android');
    expect(pusher.pushkey).toBe('tok');
    expect(pusher.data.url).toBe('https://matrix.x/_matrix/push/v1/notify');
    expect(pusher.data.default_payload).toEqual({ lang: 'pt' });
  });

  it('takes the token from any account that had it on this phone', () => {
    // Synapse removes the same pushkey from other users unless told to append.
    expect(androidPusher('tok', 'https://x', 'pt').append).toBe(false);
  });

  it('uses the same app as Sygnal', () => {
    expect(ANDROID_PUSH_APP_ID).toBe('br.com.blazeroom.android');
  });
});

describe('pushSupport in the app', () => {
  it('hides the browser switch in the app', () => {
    const available = {
      serviceWorker: true,
      pushManager: true,
      notification: true,
      standalone: false,
      userAgent: 'Chrome/130',
      configured: true,
    };
    expect(pushSupport(available)).toBe('available');
    expect(pushSupport({ ...available, userAgent: 'x BlazeroomAndroid/1' })).toBe('unavailable');
  });
});

describe('shouldRegister', () => {
  it('registers unless the user turned it off', () => {
    expect(shouldRegister({ off: false, token: 'tok' })).toBe(true);
    expect(shouldRegister({ off: true, token: 'tok' })).toBe(false);
    expect(shouldRegister({ off: false, token: undefined })).toBe(false);
  });
});

describe('call messages', () => {
  it('tells the app about the call', () => {
    expect(callStateMessage('!r:x', true)).toEqual({
      type: 'callState',
      roomId: '!r:x',
      active: true,
    });
    expect(callStateMessage('!r:x', false).active).toBe(false);
  });

  it('reads the room of an answered call', () => {
    expect(pendingCallRoom({ type: 'pendingCall', roomId: '!r:x' })).toBe('!r:x');
  });

  it('finds no answered call in an empty answer', () => {
    expect(pendingCallRoom({ type: 'pendingCall', roomId: '' })).toBeUndefined();
    expect(pendingCallRoom({ type: 'pendingCall' })).toBeUndefined();
    expect(pendingCallRoom({ type: 'pendingCall', roomId: 3 })).toBeUndefined();
  });
});

describe('androidBridge', () => {
  it('does nothing outside the app', () => {
    const bridge = createAndroidBridge(() => undefined);
    const handler = vi.fn();
    const off = bridge.on('pushToken', handler);
    expect(bridge.available()).toBe(false);
    expect(() => bridge.send({ type: 'getPushToken' })).not.toThrow();
    expect(() => off()).not.toThrow();
  });

  it('sends messages as JSON', () => {
    const { native, postMessage } = fakeNative();
    createAndroidBridge(() => native).send({ type: 'getPushToken' });
    expect(postMessage).toHaveBeenCalledWith('{"type":"getPushToken"}');
  });

  it('routes a message to the handlers of its type', () => {
    const { native, deliver } = fakeNative();
    const bridge = createAndroidBridge(() => native);
    const token = vi.fn();
    const denied = vi.fn();
    bridge.on('pushToken', token);
    bridge.on('pushDenied', denied);
    deliver('{"type":"pushToken","token":"tok"}');
    expect(token).toHaveBeenCalledWith({ type: 'pushToken', token: 'tok' });
    expect(denied).not.toHaveBeenCalled();
  });

  it('stops calling a handler that was removed', () => {
    const { native, deliver } = fakeNative();
    const bridge = createAndroidBridge(() => native);
    const handler = vi.fn();
    bridge.on('pushDenied', handler)();
    deliver('{"type":"pushDenied"}');
    expect(handler).not.toHaveBeenCalled();
  });

  it('listens to the app only once', () => {
    const { native, deliver } = fakeNative();
    const bridge = createAndroidBridge(() => native);
    const handler = vi.fn();
    bridge.on('pushDenied', handler);
    bridge.on('pushFailed', vi.fn());
    deliver('{"type":"pushDenied"}');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores a malformed message', () => {
    const { native, deliver } = fakeNative();
    const handler = vi.fn();
    createAndroidBridge(() => native).on('pushToken', handler);
    expect(() => deliver('not json')).not.toThrow();
    expect(() => deliver(3)).not.toThrow();
    expect(() => deliver('null')).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
