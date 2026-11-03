// nodeName and not instanceof: these nodes come from the call iframe, another realm.
const hasAudio = (node: Node): boolean =>
  node.nodeName === 'AUDIO' || !!(node as Element).querySelector?.('audio');

export const addsAudio = (records: MutationRecord[]): boolean =>
  records.some((record) => Array.from(record.addedNodes).some(hasAudio));
