import { ServerMessage } from './api';

// The WebSocket to /api/football/ws for one room. The first message says who we are (a
// browser can't set the token as a header) and whether we play or watch; a dropped connection
// comes back by itself, as the same person, and the API resumes the match where it is.
// Every two seconds a ping measures the round trip, which the other player gets too.

export type SocketStatus = 'connecting' | 'open' | 'closed';

const PING_MS = 2000;
const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

// These end the connection for good: retrying can't help.
const FINAL = new Set(['not_found', 'unauthorized', 'bad_team', 'full', 'replaced']);

export class FootballSocket {
  private ws: WebSocket | undefined;

  private closed = false;

  private tries = 0;

  private ping: ReturnType<typeof setInterval> | undefined;

  private retry: ReturnType<typeof setTimeout> | undefined;

  // Round trip to the API in ms, and the other player's.
  rtt = 80;

  peerRtt = 80;

  constructor(
    private hello: () => { token: string; match: string; role: 'play' | 'watch'; side?: 0 | 1 },
    private onMessage: (msg: ServerMessage) => void,
    private onStatus: (status: SocketStatus) => void
  ) {
    this.open();
  }

  private open() {
    if (this.closed) return;
    this.onStatus('connecting');
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/api/football/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.tries = 0;
      ws.send(JSON.stringify({ type: 'hello', ...this.hello() }));
      this.onStatus('open');
      this.ping = setInterval(() => this.send({ type: 'ping', at: performance.now() }), PING_MS);
    };
    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.type === 'pong') {
        this.rtt = performance.now() - msg.at;
        this.send({ type: 'rtt', ms: Math.round(this.rtt) });
        return;
      }
      if (msg.type === 'peer') this.peerRtt = msg.rtt;
      if ((msg.type === 'error' && FINAL.has(msg.code)) || msg.type === 'replaced') this.close();
      this.onMessage(msg);
    };
    ws.onclose = () => {
      clearInterval(this.ping);
      if (this.ws !== ws) return;
      this.ws = undefined;
      if (this.closed) {
        this.onStatus('closed');
        return;
      }
      this.onStatus('connecting');
      const wait = BACKOFF_MS[Math.min(this.tries, BACKOFF_MS.length - 1)];
      this.tries += 1;
      this.retry = setTimeout(() => this.open(), wait);
    };
  }

  send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  // The time an input takes from the other player to us, in ticks.
  lagTicks(): number {
    return ((this.rtt + this.peerRtt) / 2 / 1000) * 60;
  }

  close(): void {
    this.closed = true;
    clearInterval(this.ping);
    clearTimeout(this.retry);
    this.ws?.close();
    this.ws = undefined;
  }
}
