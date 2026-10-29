import { useEffect } from 'react';
import { IPushRules, PushRuleKind } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAccountData } from '../../hooks/useAccountData';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { missingSilentCallRules, silentCallRuleBody } from './silentCallRules';

// Tried once per page load, so a server that refuses doesn't get asked in a loop.
const attempted = new Set<string>();

// Adds the push rules that keep a call starting from pinging everyone (silentCallRules.ts).
export const useSilentCallRules = (): void => {
  const mx = useMatrixClient();
  const pushRulesEvt = useAccountData(AccountDataEvent.PushRules);

  useEffect(() => {
    const pushRules = pushRulesEvt?.getContent<IPushRules>();
    if (!pushRules?.global) return;

    missingSilentCallRules(pushRules)
      .filter((rule) => !attempted.has(rule.ruleId))
      .forEach((rule) => {
        attempted.add(rule.ruleId);
        mx.addPushRule(
          'global',
          PushRuleKind.Override,
          rule.ruleId,
          silentCallRuleBody(rule.type)
        ).catch((e: unknown) => {
          // eslint-disable-next-line no-console
          console.warn(`Couldn't add push rule ${rule.ruleId}`, e);
        });
      });
  }, [mx, pushRulesEvt]);
};

export function SilentCallRules() {
  useSilentCallRules();
  return null;
}
