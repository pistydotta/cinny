export const AUDIO_STATUS_EVENT = 'br.com.blazeroom.call_audio';
export const AUDIO_REQUEST_EVENT = 'br.com.blazeroom.call_audio_request';
export const AUDIO_STATUS_TTL = 90_000;

export type AudioMembership = { userId: string; deviceId: string; memberId: string };
export type AudioStatus = { microphone: boolean; sound: boolean };
export type AudioReport = AudioStatus & {
  roomId: string;
  deviceId: string;
  memberId: string;
  at: number;
};

export const audioKey = (userId: string, deviceId: string) => JSON.stringify([userId, deviceId]);

export function validAudioReport(
  sender: string | undefined,
  value: Partial<AudioReport>,
  roomId: string,
  members: AudioMembership[],
  now = Date.now()
): value is AudioReport {
  return (
    value.roomId === roomId &&
    typeof value.microphone === 'boolean' &&
    typeof value.sound === 'boolean' &&
    typeof value.at === 'number' &&
    Number.isFinite(value.at) &&
    value.at <= now + 15_000 &&
    now - value.at < AUDIO_STATUS_TTL &&
    members.some(
      (m) => m.userId === sender && m.deviceId === value.deviceId && m.memberId === value.memberId
    )
  );
}

// A person can have several devices in the call. Only show muted/deafened when
// every active device reported it, never infer either from silence or missing data.
export function userAudioStatus(
  reports: ReadonlyMap<string, AudioReport>,
  members: AudioMembership[],
  userId: string,
  now = Date.now()
): { muted: boolean; deafened: boolean } {
  const active = members.filter((m) => m.userId === userId);
  const statuses = active
    .map((m) => reports.get(audioKey(userId, m.deviceId)))
    .filter((r, i): r is AudioReport =>
      Boolean(r && r.memberId === active[i].memberId && now - r.at < AUDIO_STATUS_TTL)
    );
  const complete = active.length > 0 && statuses.length === active.length;
  return {
    muted: complete && statuses.every((s) => !s.microphone),
    deafened: complete && statuses.every((s) => !s.sound),
  };
}
