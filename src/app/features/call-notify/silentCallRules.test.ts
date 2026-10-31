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

describe('silentCallRuleBody', () => {
  it('matches the event type and does nothing', () => {
    expect(silentCallRuleBody('m.rtc.notification')).toEqual({
      actions: [],
      conditions: [{ kind: 'event_match', key: 'type', pattern: 'm.rtc.notification' }],
    });
  });
});
