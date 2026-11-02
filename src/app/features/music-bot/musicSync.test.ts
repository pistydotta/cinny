import { describe, expect, it } from 'vitest';
import { ApiError } from '../../utils/blazeroomApi';
import type { NowPlaying } from './musicApi';
import {
  DEFAULT_VOLUME,
  expectedPosition,
  formatTime,
  musicErrorText,
  parseVolume,
  shouldSeek,
} from './musicSync';

const np = (over: Partial<NowPlaying> = {}): NowPlaying => ({
  id: 't1',
  title: 'Song',
  url: 'https://www.youtube.com/watch?v=a',
  duration: 200,
  thumbnail: null,
  requestedBy: '@a:x',
  status: 'ready',
  audio: '/api/music/audio/x',
  position: 10,
  paused: false,
  ...over,
});

describe('expectedPosition', () => {
  it('moves on from the server answer', () => {
    expect(expectedPosition(np(), 1000, 3500)).toBe(12.5);
  });
  it('stays put while paused', () => {
    expect(expectedPosition(np({ paused: true }), 1000, 9000)).toBe(10);
  });
  it('never passes the end', () => {
    expect(expectedPosition(np({ position: 199 }), 0, 10_000)).toBe(200);
    expect(expectedPosition(np({ duration: null, position: 199 }), 0, 10_000)).toBe(209);
  });
  it('ignores a clock that went back', () => {
    expect(expectedPosition(np(), 5000, 4000)).toBe(10);
  });
});

describe('shouldSeek', () => {
  it('only when the drift is noticeable', () => {
    expect(shouldSeek(10, 11)).toBe(false);
    expect(shouldSeek(10, 13)).toBe(true);
    expect(shouldSeek(13, 10)).toBe(true);
  });
});

describe('formatTime', () => {
  it('formats minutes and hours', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65.9)).toBe('1:05');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(null)).toBe('--:--');
    expect(formatTime(NaN)).toBe('--:--');
  });
});

describe('parseVolume', () => {
  it('reads a saved volume or falls back', () => {
    expect(parseVolume('0.3')).toBe(0.3);
    expect(parseVolume('0')).toBe(0);
    expect(parseVolume(null)).toBe(DEFAULT_VOLUME);
    expect(parseVolume('2')).toBe(DEFAULT_VOLUME);
    expect(parseVolume('loud')).toBe(DEFAULT_VOLUME);
  });
});

describe('musicErrorText', () => {
  it('explains each error', () => {
    expect(musicErrorText(new ApiError('unsupported_link', 400))).toMatch(/not supported/);
    expect(musicErrorText(new ApiError('fetch_failed', 422))).toMatch(/Could not get/);
    expect(musicErrorText(new Error('x'))).toMatch(/went wrong/);
  });
});
