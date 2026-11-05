export type SpaceCreation = {
  sender?: string;
  content: {
    type?: string;
    creator?: string;
    room_version?: string;
    additional_creators?: string[];
  };
};

export function isSpaceOwner(create: SpaceCreation | undefined, userId: string): boolean {
  if (create?.content.type !== 'm.space') return false;
  if ((create.sender ?? create.content.creator) === userId) return true;
  return (
    Number(create.content.room_version) >= 12 &&
    Array.isArray(create.content.additional_creators) &&
    create.content.additional_creators.includes(userId)
  );
}
