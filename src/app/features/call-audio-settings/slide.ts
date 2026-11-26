// A name that doesn't fit scrolls like a ticker: at one steady speed, with its start coming
// back in after a gap, so it never stops or turns around. Undefined when the name fits.

const PX_PER_SECOND = 45;
// Space between the end of the name and its start coming round again.
export const TICKER_GAP = 32;

export const tickerTiming = (
  textWidth: number,
  boxWidth: number
): { shift: number; duration: number } | undefined => {
  if (textWidth <= boxWidth + 1) return undefined;
  // One full lap: the name and the gap after it.
  const shift = Math.ceil(textWidth) + TICKER_GAP;
  const duration = Math.round((shift / PX_PER_SECOND) * 10) / 10;
  return { shift, duration };
};
