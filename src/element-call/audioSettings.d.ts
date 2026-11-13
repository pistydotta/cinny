export const INPUT_DEVICE_KEY: string;
export const OUTPUT_DEVICE_KEY: string;
export const INPUT_GAIN_KEY: string;
export const OUTPUT_VOLUME_KEY: string;
export const MAX_INPUT_GAIN: number;
export const MAX_OUTPUT_VOLUME: number;
export type CallAudio = {
  inputDevice: string | undefined;
  outputDevice: string | undefined;
  inputGain: number;
  outputVolume: number;
};
export function readInputGain(storage: Pick<Storage, 'getItem'> | undefined): number;
export function readOutputVolume(storage: Pick<Storage, 'getItem'> | undefined): number;
export function readCallAudio(storage: Pick<Storage, 'getItem'> | undefined): CallAudio;
