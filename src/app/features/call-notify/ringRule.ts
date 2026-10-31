import { ConditionKind, IPushRules, PushRuleKind } from 'matrix-js-sdk';

export const RING_RULE_ID = 'blazeroom.ring_dm';

// Encrypted rooms hide what kind of event most things are, but not this state event, so it's how
// a phone learns a two-person call started. The sound tweak isn't for the sound: it's what makes
// Synapse send high priority, without which a sleeping Android phone can get it minutes late.
export const ringRuleBody = () => ({
  actions: ['notify', { set_tweak: 'sound', value: 'ring' }],
  conditions: [
    { kind: ConditionKind.EventMatch, key: 'type', pattern: 'org.matrix.msc3401.call.member' },
    { kind: ConditionKind.RoomMemberCount, is: '2' },
  ],
});

// A rule the user turned off stays off.
export const needsRingRule = (pushRules: IPushRules): boolean =>
  !(pushRules.global[PushRuleKind.Override] ?? []).some((rule) => rule.rule_id === RING_RULE_ID);
