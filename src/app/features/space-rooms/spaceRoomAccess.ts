// A space's rooms belong to it, like channels in a Discord server: only people who joined the
// space can be invited to its rooms. The server enforces this too (blazeroom's Synapse
// module); here it keeps the app from offering invites that would fail.

export type SpaceLink = { stateKey: string; via?: unknown };

// The spaces a room says it's in. A link without `via` has been removed (Matrix spec).
export const linkedSpaceIds = (parents: SpaceLink[]): string[] =>
  parents
    .filter((p) => p.stateKey && Array.isArray(p.via) && p.via.length > 0)
    .map((p) => p.stateKey);

// Who may be invited: anyone for a room outside spaces (undefined), otherwise members of
// one of its spaces.
export const canInviteToRoom = (userId: string, spaceMembers: ReadonlySet<string> | undefined) =>
  !spaceMembers || spaceMembers.has(userId);

// The people to offer in "only people I pick": the space's members other than you, by name.
export const pickableMembers = (
  members: { userId: string; name: string }[],
  myUserId: string
): { userId: string; name: string }[] =>
  members
    .filter((m) => m.userId !== myUserId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
