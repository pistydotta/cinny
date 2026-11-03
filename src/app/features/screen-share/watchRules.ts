export const DEFAULT_VOLUME = 0.5;

const VOLUME_KEY = 'blazeroom.screenShareVolume';

// Two people in the call means the one watching is the only possible viewer, so the share opens
// by itself. Several devices of one person count once. undefined: nobody is in the call yet, wait.
export const shouldAutoWatch = (memberUserIds: string[]): boolean | undefined => {
  if (memberUserIds.length === 0) return undefined;
  return new Set(memberUserIds).size === 2;
};

export const readSavedVolume = (storage: Pick<Storage, 'getItem'>): number => {
  try {
    const volume = Number(storage.getItem(VOLUME_KEY));
    return volume > 0 && volume <= 1 ? volume : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
};

// 0 is a mute, not a preference: it would come back silent with no hint why.
export const saveVolume = (storage: Pick<Storage, 'setItem'>, volume: number): void => {
  if (!(volume > 0 && volume <= 1)) return;
  try {
    storage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Storage blocked: the volume just isn't remembered.
  }
};
