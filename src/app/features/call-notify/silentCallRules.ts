import { ConditionKind, IPushRules, PushRuleKind } from 'matrix-js-sdk';

// Element Call sends one of these when someone starts a call, mentioning @room so other
// clients can ring. Under the default push rules that counts as a mention for everyone in
// the room. The "joined the call" line in the chat comes from the call member state
// instead, so silencing these keeps the line without the ping.
export const SILENT_CALL_EVENT_TYPES = [
  'org.matrix.msc4075.rtc.notification',
  'org.matrix.msc4075.call.notify',
  'm.rtc.notification',
];

export type SilentCallRule = {
  ruleId: string;
  type: string;
};

export const SILENT_CALL_RULES: SilentCallRule[] = SILENT_CALL_EVENT_TYPES.map((type) => ({
  ruleId: `blazeroom.silent_call.${type}`,
  type,
}));

export const silentCallRuleBody = (type: string) => ({
  actions: [],
  conditions: [{ kind: ConditionKind.EventMatch, key: 'type', pattern: type }],
});

// The rules the account doesn't have yet. A rule the user turned off stays off.
export const missingSilentCallRules = (pushRules: IPushRules): SilentCallRule[] => {
  const existing = new Set(
    (pushRules.global[PushRuleKind.Override] ?? []).map((rule) => rule.rule_id)
  );
  return SILENT_CALL_RULES.filter((rule) => !existing.has(rule.ruleId));
};
