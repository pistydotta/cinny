import { describe, expect, it } from 'vitest';
import { IPushRule, IPushRules } from 'matrix-js-sdk';
import { missingSilentCallRules, SILENT_CALL_RULES, silentCallRuleBody } from './silentCallRules';

const withOverrides = (ruleIds: string[]): IPushRules => ({
  global: {
    override: ruleIds.map(
      (ruleId) => ({ rule_id: ruleId, default: false, enabled: true, actions: [] } as IPushRule)
    ),
  },
});

describe('missingSilentCallRules', () => {
  it('asks for every rule on a new account', () => {
    expect(missingSilentCallRules({ global: {} })).toEqual(SILENT_CALL_RULES);
  });

  it('skips the rules already there', () => {
    const [first, ...rest] = SILENT_CALL_RULES;
    expect(missingSilentCallRules(withOverrides([first.ruleId, '.m.rule.master']))).toEqual(rest);
  });
});

const ruleEndingIn = (suffix: string) => {
  const rule = SILENT_CALL_RULES.find((r) => r.ruleId.endsWith(suffix));
  if (!rule) throw new Error(`no rule ending in ${suffix}`);
  return rule;
};

describe('silentCallRuleBody', () => {
  it('matches the event type and does nothing', () => {
    const rule = ruleEndingIn('.m.rtc.notification');
    expect(silentCallRuleBody(rule)).toEqual({
      actions: [],
      conditions: [{ kind: 'event_match', key: 'type', pattern: 'm.rtc.notification' }],
    });
  });

  it('silences call join and leave lines outside two-person rooms', () => {
    const rule = ruleEndingIn('call.member');
    expect(silentCallRuleBody(rule)).toEqual({
      actions: [],
      conditions: [
        { kind: 'event_match', key: 'type', pattern: 'org.matrix.msc3401.call.member' },
        { kind: 'room_member_count', is: '>2' },
      ],
    });
  });
});
