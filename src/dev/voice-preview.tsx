import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { configClass, varsClass, Icon, Icons } from 'folds';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { DarkTheme } from '../app/hooks/useTheme';
import { MusicPanel } from '../app/features/music-bot/MusicPanel';
import type { MusicView, NowPlaying } from '../app/features/music-bot/musicApi';
import { MusicAudience } from '../app/features/music-bot/MusicAudience';
import { VoiceMemberPopover } from '../app/features/call/VoiceMemberPopover';
import * as voiceCss from '../app/features/call/voiceMember.css';
import './voice-preview.css';

// Standalone local fixtures: no Matrix login, API, providers or real user data.
document.body.classList.add(configClass, varsClass, ...DarkTheme.classNames);
const sample = (title: string): NowPlaying => ({
  id: crypto.randomUUID(),
  title,
  url: 'https://example.com/music',
  thumbnail: null,
  requestedBy: 'You',
  status: 'ready',
  audio: 'local-sample',
  position: 0,
  duration: 180,
  paused: false,
});
const initial = (): MusicView => ({
  version: 1,
  nowPlaying: sample('Late night radio'),
  queue: [sample('Another quiet evening')],
});
function Preview() {
  const [room, setRoom] = useState<string | undefined>('Sala 1');
  const [shared, setShared] = useState(false);
  const [personal, setPersonal] = useState(initial);
  const [rooms, setRooms] = useState<Record<string, MusicView>>({
    'Sala 1': initial(),
    'Sala 2': { version: 0, nowPlaying: null, queue: [] },
  });
  const [volume, setVolume] = useState(0.6);
  const [member, setMember] = useState<string>();
  const [memberAnchor, setMemberAnchor] = useState<DOMRect>();
  const [memberVolume, setMemberVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [sound, setSound] = useState(true);
  const [chat, setChat] = useState('');
  const [messages, setMessages] = useState([
    'Pick a participant to open the small voice controls.',
    'The player stays here when you change chats.',
  ]);
  const [sampleOn, setSampleOn] = useState(false);
  const context = useRef<AudioContext>();
  const gain = useRef<GainNode>();
  const openMember = (name: string, event: React.MouseEvent<HTMLButtonElement>) => {
    setMemberAnchor(event.currentTarget.getBoundingClientRect());
    setMember(name);
  };
  const view = shared && room ? rooms[room] : personal;
  const update = (next: MusicView) => {
    if (shared && room) setRooms((all) => ({ ...all, [room]: next }));
    else setPersonal(next);
  };
  const join = (next?: string) => {
    setRoom(next);
    setShared(false);
    setMember(undefined);
  };
  useEffect(() => {
    if (gain.current)
      gain.current.gain.value =
        sampleOn && sound && view.nowPlaying && !view.nowPlaying.paused ? volume * 0.05 : 0;
  }, [sampleOn, sound, view, volume]);
  const toggleSample = async () => {
    if (!context.current) {
      context.current = new AudioContext();
      gain.current = context.current.createGain();
      gain.current.connect(context.current.destination);
      [220, 275, 330].forEach((frequency) => {
        const oscillator = context.current!.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        oscillator.connect(gain.current!);
        oscillator.start();
      });
    }
    await context.current.resume();
    setSampleOn((on) => !on);
  };
  return (
    <div className="preview">
      <div className="preview-banner">
        <strong>LOCAL PREVIEW</strong>
        <span>Sample rooms · changes stay on this page</span>
        <button onClick={toggleSample}>
          {sampleOn ? 'Mute sample audio' : 'Try sample audio'}
        </button>
      </div>
      <div className="workspace">
        <aside className="rail">
          <span className="logo">b.</span>
          <button onClick={() => join('Sala 1')}>Ce</button>
          <button onClick={() => join('Sala 2')}>Be</button>
        </aside>
        <aside className="sidebar">
          <header>
            Central de Negócios <span>⌄</span>
          </header>
          <nav>
            <button
              onClick={() =>
                setMessages((all) => [...all, 'Lobby selected. Music keeps its destination.'])
              }
            >
              ⚑　Lobby
            </button>
            <button
              onClick={() =>
                setMessages((all) => [...all, 'Text chat selected. Music keeps its destination.'])
              }
            >
              #　Chat 1
            </button>
            <h5>VOICE ROOMS</h5>
            {['Sala 1', 'Sala 2'].map((name) => (
              <div key={name}>
                <button className={room === name ? 'selected' : ''} onClick={() => join(name)}>
                  ◖))　{name}
                  <small>{room === name ? 'Connected' : 'Join'}</small>
                </button>
                {room === name && (
                  <div className="members">
                    {['You', 'Alex', 'Sam'].map((name) => (
                      <button key={name} onClick={(event) => openMember(name, event)}>
                        <span className="avatar">{name[0]}</span>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="dock">
            <MusicPanel
              audience={
                <MusicAudience
                  shared={shared}
                  roomName={room}
                  onToggle={() => {
                    if (!room) return;
                    if (!shared && personal.nowPlaying) {
                      setRooms((all) => ({
                        ...all,
                        [room]: {
                          ...all[room],
                          nowPlaying: all[room].nowPlaying ?? personal.nowPlaying,
                          queue: all[room].nowPlaying
                            ? [...all[room].queue, personal.nowPlaying!]
                            : all[room].queue,
                        },
                      }));
                      setPersonal((old) => ({
                        ...old,
                        nowPlaying: old.nowPlaying ? { ...old.nowPlaying, paused: true } : null,
                      }));
                    }
                    setShared((value) => !value);
                  }}
                />
              }
              key={`${shared}-${room}`}
              canPost
              snapshot={{ view, receivedAt: performance.now(), connected: true }}
              listening
              playback="playing"
              deafened={!sound}
              volume={volume}
              setVolume={setVolume}
              pending={false}
              busy={false}
              nameOf={(id) => id}
              add={async (title) => {
                const track = sample(title);
                update({
                  ...view,
                  nowPlaying: view.nowPlaying ?? track,
                  queue: view.nowPlaying ? [...view.queue, track] : view.queue,
                });
                return true;
              }}
              control={async (action) => {
                if (action === 'stop') update({ ...view, nowPlaying: null, queue: [] });
                else if (action === 'skip')
                  update({
                    ...view,
                    nowPlaying: (view.queue[0] as NowPlaying) ?? null,
                    queue: view.queue.slice(1),
                  });
                else
                  update({
                    ...view,
                    nowPlaying: view.nowPlaying
                      ? { ...view.nowPlaying, paused: action === 'pause' }
                      : null,
                  });
              }}
              remove={async (id) =>
                update({ ...view, queue: view.queue.filter((track) => track.id !== id) })
              }
            />
            {room && (
              <div className="connection">
                <span className="green">● Voice connected</span>
                <span>{room}</span>
                <button onClick={() => join()}>Disconnect</button>
              </div>
            )}
          </div>
        </aside>
        <main>
          <header>
            {room ?? 'Your space'}
            <small>{room ? 'Voice and chat' : 'Listening privately'}</small>
          </header>
          <div className="call-area">
            {room ? (
              <>
                <div className="people">
                  {['You', 'Alex', 'Sam'].map((name) => (
                    <button
                      key={name}
                      className="person"
                      onClick={(event) => openMember(name, event)}
                    >
                      <div>{name[0]}</div>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
                <div className="call-buttons">
                  <button onClick={() => setMuted((v) => !v)}>
                    {muted ? 'Unmute microphone' : 'Mute microphone'}
                  </button>
                  <button onClick={() => setSound((v) => !v)}>
                    {sound ? 'Deafen' : 'Enable sound'}
                  </button>
                  <button onClick={() => join()}>Leave call</button>
                </div>
              </>
            ) : (
              <h2>Your music, just for you.</h2>
            )}
          </div>
          <section className="chat">
            <h4># Chat 1</h4>
            {messages.map((text, i) => (
              <p key={`${i}-${text}`}>
                <span className="avatar">{i % 2 ? 'S' : 'A'}</span>
                <span>
                  <b>{i % 2 ? 'Sam' : 'Alex'}</b>
                  <br />
                  {text}
                </span>
              </p>
            ))}
          </section>
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (chat.trim()) {
                setMessages((all) => [...all, chat]);
                setChat('');
              }
            }}
          >
            <input
              placeholder="Message #Chat 1 — still clickable with voice controls open"
              value={chat}
              onChange={(event) => setChat(event.target.value)}
            />
            <button>Send</button>
          </form>
        </main>
      </div>
      {member && memberAnchor && (
        <VoiceMemberPopover anchor={memberAnchor} onClose={() => setMember(undefined)}>
          <div className="voice-popup">
            <div className="popup-header">
              <b>{member}</b>
              <button aria-label="Close controls" onClick={() => setMember(undefined)}>
                ×
              </button>
            </div>
            {member === 'You' ? (
              <div className="self-controls">
                <button onClick={() => setMuted((v) => !v)}>
                  <Icon size="100" src={muted ? Icons.MicMute : Icons.Mic} />
                </button>
                <button onClick={() => setSound((v) => !v)}>
                  <Icon size="100" src={sound ? Icons.Headphone : Icons.HeadphoneMute} />
                </button>
              </div>
            ) : (
              <>
                <label className={voiceCss.Volume}>
                  User volume
                  <input
                    className={voiceCss.Slider}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={memberVolume}
                    onChange={(event) => setMemberVolume(Number(event.target.value))}
                  />
                  <span>{Math.round(memberVolume * 100)}%</span>
                </label>
                <button
                  className={voiceCss.Kick}
                  onClick={() => {
                    setMessages((all) => [...all, `${member} kicked (preview only).`]);
                    setMember(undefined);
                  }}
                >
                  Kick from room
                </button>
              </>
            )}
          </div>
        </VoiceMemberPopover>
      )}
    </div>
  );
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Preview />);
