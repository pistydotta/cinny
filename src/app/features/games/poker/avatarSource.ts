// Only Matrix media is fetched: a friend could set any other URL as their avatar to see the IPs
// of everyone at the table.
export const avatarSource = (
  url: string,
  fromMxc: (mxc: string) => string | undefined
): string | undefined => (url.startsWith('mxc://') ? fromMxc(url) : undefined);
