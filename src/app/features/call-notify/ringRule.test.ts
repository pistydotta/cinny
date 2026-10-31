import { describe, expect, it } from 'vitest';
import { IPushRule, IPushRules } from 'matrix-js-sdk';
import { needsRingRule, RING_RULE_ID, ringRuleBody } from './ringRule';

const withOverrides = (ruleIds: string[], enabled = true): IPushRules => ({
  global: {
    override: ruleIds.map(
      (ruleId) => ({ rule_id: ruleId, default: false, enabled, actions: [] } as IPushRule)
    ),
  },
});

describe('ringRuleBody', () => {
  it('rings only in two-person rooms, at high priority', () => {
    expect(ringRuleBody()).toEqual({
      actions: ['notify', { set_tweak: 'sound', value: 'ring' }],
      conditions: [
        { kind: 'event_match', key: 'type', pattern: 'org.matrix.msc3401.call.member' },
        { kind: 'room_member_count', is: '2' },
      ],
    });
  });
});

describe('needsRingRule', () => {
  it('asks for the rule on a new account', () => {
    expect(needsRingRule({ global: {} })).toBe(true);
    expect(needsRingRule(withOverrides(['.m.rule.master']))).toBe(true);
  });

  it('keeps a rule the user turned off', () => {
    expect(needsRingRule(withOverrides([RING_RULE_ID], false))).toBe(false);
  });
});
