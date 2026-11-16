export const DEFAULT_VOLUME = 0.5;

const VOLUME_KEY = 'blazeroom.screenShareVolume';

// Two people in the call means the one watching is the only possible viewer, so the share opens
// by itself. Several devices of one person count once. undefined: fewer than two people listed,
// wait. A remote share means at least two are there, so a shorter list is still loading.
export const shouldAutoWatch = (memberUserIds: string[]): boolean | undefined => {
  const people = new Set(memberUserIds).size;
  if (people < 2) return undefined;
  return people === 2;
};

// Storage comes as a getter: where it's blocked, even reading the `localStorage` global throws.
export const readSavedVolume = (getStorage: () => Pick<Storage, 'getItem'>): number => {
  try {
    const volume = Number(getStorage().getItem(VOLUME_KEY));
    return volume > 0 && volume <= 1 ? volume : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
};

// 0 is a mute, not a preference: it would come back silent with no hint why.
export const saveVolume = (getStorage: () => Pick<Storage, 'setItem'>, volume: number): void => {
  if (!(volume > 0 && volume <= 1)) return;
  try {
    getStorage().setItem(VOLUME_KEY, String(volume));
  } catch {
    // Storage blocked: the volume just isn't remembered.
  }
};
