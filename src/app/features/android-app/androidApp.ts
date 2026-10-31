// Matches `apps:` in templates/sygnal-android.yaml (blazeroom repo).
export const ANDROID_PUSH_APP_ID = 'br.com.blazeroom.android';

// Set when the user turns notifications off in Settings, on this phone only.
export const ANDROID_PUSH_OFF_KEY = 'blazeroom_android_push_off';

// The Android app adds itself to the user agent (blazeroom repo, android/).
export const isAndroidApp = (userAgent: string): boolean => userAgent.includes('BlazeroomAndroid/');

// What Synapse needs to reach this phone through Sygnal and Firebase. `append: false` removes this
// token from any other account that used the phone before, and `default_payload` comes back in
// every push, which is how the app learns the language.
export const androidPusher = (token: string, gatewayUrl: string, lang: string) => ({
  kind: 'http' as const,
  app_id: ANDROID_PUSH_APP_ID,
  pushkey: token,
  app_display_name: 'blazeroom',
  device_display_name: 'blazeroom android',
  lang,
  append: false,
  data: {
    url: gatewayUrl,
    default_payload: { lang },
  },
});

export const callStateMessage = (roomId: string, active: boolean) => ({
  type: 'callState',
  roomId,
  active,
});

// The app's answer to getPendingCall: the room of a call just answered on its screen, if any.
export const pendingCallRoom = (message: Record<string, unknown>): string | undefined =>
  typeof message.roomId === 'string' && message.roomId ? message.roomId : undefined;

export const shouldRegister = ({ off, token }: { off: boolean; token?: string }): boolean =>
  !off && !!token;
