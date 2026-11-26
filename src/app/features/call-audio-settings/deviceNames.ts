// Windows names a device "Microphone (2- fifine Microphone)": the kind, then the product in
// parentheses with a number when there are several. Chrome on Linux and macOS adds the USB ids,
// "HD Webcam (046d:0825)". The product alone is what people recognise, and it fits the menu.
export const deviceName = (label: string): string => {
  const withoutIds = label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '').trim();
  const product = withoutIds.match(/^[^(]+?\s\((.+)\)$/)?.[1] ?? withoutIds;
  return product.replace(/^\d+-\s*/, '').trim() || label;
};

// Short names, unless two devices would end up with the same one: those keep the full label.
export const deviceNames = (labels: string[]): string[] => {
  const short = labels.map(deviceName);
  return short.map((name, i) => (short.filter((n) => n === name).length > 1 ? labels[i] : name));
};

// A long list shows its first few devices and the chosen one, with a row to see the rest, so
// the menu never needs a scrollbar for the usual two to four.
export const SHOWN_DEVICES = 4;

export const shownDevices = <T>(devices: T[], isSelected: (device: T) => boolean): T[] => {
  if (devices.length <= SHOWN_DEVICES + 1) return devices;
  const first = devices.slice(0, SHOWN_DEVICES);
  const selected = devices.find(isSelected);
  if (!selected || first.includes(selected)) return first;
  return [...first.slice(0, SHOWN_DEVICES - 1), selected];
};
