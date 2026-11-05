import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaptureVolume } from './shareState';

afterEach(() => vi.unstubAllGlobals());
describe('shared capture volume', () => {
  it('keeps raw audio when starting Web Audio is blocked', async () => {
    const close = vi.fn(async () => undefined);
    const Context = vi.fn(() => ({
      resume: async () => {
        throw new Error('Blocked');
      },
      close,
    }));
    const stream = { getAudioTracks: () => [{}], removeTrack: vi.fn() };
    expect(
      await createCaptureVolume(
        stream as unknown as MediaStream,
        Context as unknown as typeof AudioContext
      )
    ).toBeUndefined();
    expect(stream.removeTrack).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });
  it('passes through captures with no audio', async () => {
    const stream = { getAudioTracks: () => [] } as unknown as MediaStream;
    expect(await createCaptureVolume(stream)).toBeUndefined();
  });
  it('changes only outgoing captured audio and cleans up both tracks and the graph', async () => {
    const raw = { stop: vi.fn() };
    const output = { stop: vi.fn() };
    const gain = { connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn() } };
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const destination = { stream: { getAudioTracks: () => [output] } };
    const close = vi.fn(async () => undefined);
    const Context = vi.fn(() => ({
      currentTime: 12,
      createGain: () => gain,
      createMediaStreamSource: () => source,
      createMediaStreamDestination: () => destination,
      resume: async () => undefined,
      close,
    }));
    vi.stubGlobal('MediaStream', vi.fn());
    const stream = { getAudioTracks: () => [raw], removeTrack: vi.fn(), addTrack: vi.fn() };
    const mixer = await createCaptureVolume(
      stream as unknown as MediaStream,
      Context as unknown as typeof AudioContext
    );
    expect(stream.removeTrack).toHaveBeenCalledWith(raw);
    expect(stream.addTrack).toHaveBeenCalledWith(output);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(destination);
    mixer?.setVolume(0.35);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.35, 12);
    mixer?.dispose();
    expect(raw.stop).toHaveBeenCalledOnce();
    expect(output.stop).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
  it('preserves original audio when the browser cannot create an audio graph', async () => {
    const BrokenContext = vi.fn(() => {
      throw new Error('Unsupported');
    });
    const stream = { getAudioTracks: () => [{}], removeTrack: vi.fn() };
    expect(
      await createCaptureVolume(
        stream as unknown as MediaStream,
        BrokenContext as unknown as typeof AudioContext
      )
    ).toBeUndefined();
    expect(stream.removeTrack).not.toHaveBeenCalled();
  });
});
