// Browsers name a capture track after its source. A window or tab has a readable title, but
// a whole screen can come out as an internal ID such as "screen:0:0".
const INTERNAL_LABEL = /^(screen|window|web-contents-media-stream):/i;

export const readableShareLabel = (label: string): string | undefined => {
  const trimmed = label.trim();
  if (!trimmed || INTERNAL_LABEL.test(trimmed)) return undefined;
  return trimmed;
};
