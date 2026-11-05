type VoiceCall = { roomId: string; joined: boolean };

// Object identity matters: joining the same room again is a new sharing decision.
export const musicDestination = (call?: VoiceCall, sharedCall?: VoiceCall): string =>
  call?.joined && sharedCall === call ? call.roomId : 'personal';
