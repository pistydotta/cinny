import { useEffect, useRef, useState } from 'react';
import { ClientEvent, MatrixEvent, Room } from 'matrix-js-sdk';
import { CallMembership } from 'matrix-js-sdk/lib/matrixrtc/CallMembership';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCallJoined } from '../../hooks/useCallEmbed';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { CallEmbed, useCallControlState } from '../../plugins/call';
import { CallControlEvent } from '../../plugins/call/CallControl';
import { callEmbedAtom } from '../../state/callEmbed';
import type { VoiceStore } from '../../../element-call/voiceVolume';
import {
  AUDIO_REQUEST_EVENT,
  AUDIO_STATUS_EVENT,
  AudioReport,
  audioKey,
  validAudioReport,
} from './audioStatus';

// To-device messages keep audio status out of chat history and notifications.
// Room members can see it from the sidebar without connecting to LiveKit.
export function useBroadcastCallAudio(embed: CallEmbed) {
  const mx = useMatrixClient();
  const joined = useCallJoined(embed);
  const state = useCallControlState(embed.control);
  const members = useCallMembers(useCallSession(embed.room));
  const publishRef = useRef<() => void>(() => {
    /* The call has not joined yet. */
  });

  useEffect(() => {
    if (!joined) return undefined;
    const mine = members.find(
      (m) => m.userId === mx.getSafeUserId() && m.deviceId === mx.getDeviceId()
    );
    if (!mine) return undefined;
    const publish = () => {
      const report: AudioReport = {
        roomId: embed.roomId,
        deviceId: mine.deviceId,
        memberId: mine.memberId,
        microphone: state.microphone,
        sound: state.sound,
        at: Date.now(),
      };
      const recipients = new Map(
        embed.room
          .getJoinedMembers()
          .map((m: { userId: string }) => [m.userId, new Map([['*', report]])])
      );
      mx.sendToDevice(AUDIO_STATUS_EVENT, recipients).catch(() => {
        /* Status retries on the next heartbeat. */
      });
    };
    publishRef.current = publish;
    publish();
    const timer = setInterval(publish, 30_000);
    return () => {
      clearInterval(timer);
      publishRef.current = () => {
        /* No status after leaving the call. */
      };
    };
  }, [mx, embed, joined, members, state.microphone, state.sound]);

  useEffect(() => {
    const last = new Map<string, number>();
    const receive = (event: MatrixEvent) => {
      if (event.getType() !== AUDIO_REQUEST_EVENT || event.getContent().roomId !== embed.roomId)
        return;
      const sender = event.getSender();
      if (!sender || embed.room.getMember(sender)?.membership !== 'join') return;
      if (Date.now() - (last.get(sender) ?? 0) < 5000) return;
      last.set(sender, Date.now());
      publishRef.current();
    };
    mx.on(ClientEvent.ToDeviceEvent, receive);
    return () => {
      mx.removeListener(ClientEvent.ToDeviceEvent, receive);
    };
  }, [mx, embed]);
}

export function useCallAudioReports(room: Room, members: CallMembership[]) {
  const mx = useMatrixClient();
  const embed = useAtomValue(callEmbedAtom);
  const [reports, setReports] = useState<Map<string, AudioReport>>(new Map());
  const [liveMuted, setLiveMuted] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    setLiveMuted(new Map());
    if (!embed || embed.roomId !== room.roomId) return undefined;
    const refresh = () => {
      const win = embed.control.iframe.contentWindow as { blazeroomVoices?: VoiceStore } | null;
      const next = new Map<string, boolean>();
      members.forEach((m) => {
        const muted = win?.blazeroomVoices?.microphoneMuted?.(m.userId);
        if (muted !== undefined) next.set(m.userId, muted);
      });
      setLiveMuted((old) =>
        old.size === next.size && [...next].every(([key, value]) => old.get(key) === value)
          ? old
          : next
      );
    };
    refresh();
    const timer = setInterval(refresh, 500);
    return () => {
      clearInterval(timer);
    };
  }, [embed, room, members]);

  useEffect(() => {
    setReports(new Map());
    const receive = (event: MatrixEvent) => {
      if (event.getType() !== AUDIO_STATUS_EVENT) return;
      const sender = event.getSender();
      const report = event.getContent<Partial<AudioReport>>();
      if (!sender || !validAudioReport(sender, report, room.roomId, members)) return;
      const key = audioKey(sender, report.deviceId);
      setReports((old) => {
        if ((old.get(key)?.at ?? 0) > report.at) return old;
        return new Map(old).set(key, report);
      });
    };
    mx.on(ClientEvent.ToDeviceEvent, receive);
    const recipients = new Map(
      members.map((m) => [m.userId, new Map([['*', { roomId: room.roomId }]])])
    );
    if (recipients.size)
      mx.sendToDevice(AUDIO_REQUEST_EVENT, recipients).catch(() => {
        /* Periodic reports still arrive. */
      });
    // Refresh expired reports even when nobody changes a control.
    const timer = setInterval(() => setReports((old) => new Map(old)), 15_000);
    return () => {
      clearInterval(timer);
      mx.removeListener(ClientEvent.ToDeviceEvent, receive);
    };
  }, [mx, room, members]);

  useEffect(() => {
    if (!embed || embed.roomId !== room.roomId) return undefined;
    const mine = members.find(
      (m) => m.userId === mx.getSafeUserId() && m.deviceId === mx.getDeviceId()
    );
    if (!mine) return undefined;
    const update = () => {
      setReports((old) =>
        new Map(old).set(audioKey(mine.userId, mine.deviceId), {
          roomId: room.roomId,
          deviceId: mine.deviceId,
          memberId: mine.memberId,
          at: Date.now(),
          microphone: embed.control.microphone,
          sound: embed.control.sound,
        })
      );
    };
    update();
    embed.control.on(CallControlEvent.StateUpdate, update);
    const timer = setInterval(update, 30_000);
    return () => {
      clearInterval(timer);
      embed.control.off(CallControlEvent.StateUpdate, update);
    };
  }, [mx, room, members, embed]);
  return { reports, liveMuted };
}
