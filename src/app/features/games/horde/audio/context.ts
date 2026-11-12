// One AudioContext for the game, made on the click that starts a run: browsers only let a page
// play sound after the person did something. Tiny on purpose, so it can live in the main bundle
// while the sounds themselves load with the 3D scene.
let shared: AudioContext | undefined;

export const unlockAudio = (): AudioContext | undefined => {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    shared ??= new Ctor();
    shared.resume().catch(() => undefined);
    return shared;
  } catch {
    return undefined;
  }
};

export const audioContext = (): AudioContext | undefined => shared;
