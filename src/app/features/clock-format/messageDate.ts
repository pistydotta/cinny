// The year at either end of a date format, with the separator next to it: "D MMM YYYY" -> "D MMM",
// "YYYY-MM-DD" -> "MM-DD". A custom format with the year in the middle stays as it is.
const YEAR_AT_END = /[^A-Za-z]*Y{2,4}$/;
const YEAR_AT_START = /^Y{2,4}[^A-Za-z]*/;

export const withoutYear = (format: string): string => {
  const short = format.replace(YEAR_AT_END, '').replace(YEAR_AT_START, '');
  return short === '' ? format : short;
};

// Message dates from this year leave the year out, as chat apps do.
export const messageDateFormat = (ts: number, format: string, now: number = Date.now()): string =>
  new Date(ts).getFullYear() === new Date(now).getFullYear() ? withoutYear(format) : format;
