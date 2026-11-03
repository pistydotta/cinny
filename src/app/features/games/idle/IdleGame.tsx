import React, { useState } from 'react';
import { Icon, Icons } from 'folds';
import {
  ActionError,
  ActionResult,
  allocate,
  buyUpgrade,
  equip,
  goToStage,
  move,
  rotate,
  sell,
  sellUpTo,
  setAutoAdvance,
  unequip,
} from './engine/actions';
import { fightRival } from './engine/arena';
import { getClass } from './engine/classes';
import { xpToNext } from './engine/progress';
import { GameState } from './engine/types';
import { formatBig, formatDuration } from './format';
import { className } from './labels';
import { useIdleGame } from './useIdleGame';
import { ClassPicker } from './ClassPicker';
import { BattleView } from './BattleView';
import { HeroView } from './HeroView';
import { BackpackView } from './BackpackView';
import { UpgradesView } from './UpgradesView';
import { ArenaView } from './ArenaView';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type TabId = 'battle' | 'hero' | 'backpack' | 'upgrades' | 'arena';

const errorText = (e: ActionError): string => {
  switch (e) {
    case 'bag_full':
      return tr('games.idle.error.bag_full', 'There is no room in the backpack for that.');
    case 'not_enough_gold':
      return tr('games.idle.error.gold', 'Not enough gold.');
    case 'maxed':
      return tr('games.idle.error.maxed', 'Already at the top level.');
    case 'no_points':
      return tr('games.idle.error.points', 'No points to spend.');
    default:
      return tr('games.idle.error.not_found', 'That item isn’t there anymore.');
  }
};

type IdleGameProps = {
  userId: string;
  defaultName: string;
  onBack: () => void;
};

export function IdleGame({ userId, defaultName, onBack }: IdleGameProps) {
  const { runner, view } = useIdleGame();
  const [tab, setTab] = useState<TabId>('battle');
  const [error, setError] = useState<string>();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const { state, offline } = view;

  const run = (action: (s: GameState) => ActionResult) => {
    const result = runner.dispatch(action);
    setError(result && !result.ok ? errorText(result.error) : undefined);
  };

  const header = (
    <div className={css.Header}>
      <button
        type="button"
        className={css.IconButton}
        onClick={onBack}
        aria-label={tr('games.action.back', 'Back')}
      >
        <Icon size="200" src={Icons.ArrowLeft} />
      </button>
      <div className={css.Grow}>
        <h1 className={css.Title}>{tr('games.idle.title', 'Ember Chronicles')}</h1>
        <p className={css.Subtitle}>
          {tr(
            'games.idle.subtitle',
            'An idle RPG: your hero keeps fighting while the app is open.'
          )}
        </p>
      </div>
      {state && (
        <span className={css.Pill}>
          🪙 <span className={css.GoldText}>{formatBig(state.gold)}</span>
        </span>
      )}
    </div>
  );

  const cloudError = (
    <div className={css.Banner}>
      <span style={{ fontSize: 26 }}>☁️</span>
      <div className={css.Grow}>
        <div className={css.Strong}>
          {tr('games.idle.cloud_error_title', 'Couldn’t reach your account’s save')}
        </div>
        <div className={css.Muted}>
          {state
            ? tr(
                'games.idle.cloud_error_playing',
                'Your hero keeps playing and is saved in this browser. It goes to your account as soon as the connection is back.'
              )
            : tr(
                'games.idle.cloud_error_text',
                'Your hero may be saved there. Try again before starting a new one.'
              )}
        </div>
      </div>
      <button type="button" className={css.Button} onClick={runner.retryCloud}>
        {tr('games.idle.cloud_retry', 'Try again')}
      </button>
    </div>
  );

  if (!state) {
    let body = <ClassPicker defaultName={defaultName} onStart={runner.start} />;
    if (view.cloud === 'loading') {
      body = (
        <div className={css.Panel}>
          <span className={css.Muted}>
            {tr('games.idle.cloud_loading', 'Looking for your hero in your account…')}
          </span>
        </div>
      );
    }
    if (view.cloud === 'error') body = cloudError;
    return (
      <div className={css.Page}>
        <div className={css.Inner}>
          {header}
          {body}
        </div>
      </div>
    );
  }

  const cls = getClass(state.hero.classId);
  const need = xpToNext(state.hero.level);
  const tabs: { id: TabId; label: string; dot?: boolean }[] = [
    { id: 'battle', label: `⚔️ ${tr('games.idle.tab.battle', 'Battle')}` },
    {
      id: 'hero',
      label: `🧙 ${tr('games.idle.tab.hero', 'Hero')}`,
      dot: state.hero.freePoints > 0,
    },
    { id: 'backpack', label: `🎒 ${tr('games.idle.tab.backpack', 'Backpack')}` },
    { id: 'upgrades', label: `📈 ${tr('games.idle.tab.upgrades', 'Training')}` },
    { id: 'arena', label: `🏆 ${tr('games.idle.tab.arena', 'Arena')}` },
  ];

  return (
    <div className={css.Page}>
      <div className={css.Inner}>
        {header}

        <div className={css.HeroBar}>
          <span className={css.Portrait} style={{ background: `${cls.color}33` }}>
            {cls.icon}
          </span>
          <div className={css.Grow}>
            <div className={css.HeroName}>
              {state.hero.name}{' '}
              <span className={css.Muted}>
                · {className(cls.id)} ·{' '}
                {tr('games.idle.lv', 'Lv {{level}}', { level: state.hero.level })}
              </span>
            </div>
            <div className={css.Bar}>
              <div
                className={css.BarFill}
                style={{
                  width: `${Math.min(100, (state.hero.xp / need) * 100)}%`,
                  background: 'linear-gradient(90deg, #7b5cff, #b48cff)',
                }}
              />
            </div>
            <div className={css.HpText}>
              {tr('games.idle.xp', '{{xp}} / {{need}} XP', {
                xp: formatBig(state.hero.xp),
                need: formatBig(need),
              })}
            </div>
          </div>
          <span className={css.Pill}>
            {tr('games.idle.best_stage', 'Best stage {{stage}}', { stage: state.maxStage })}
          </span>
        </div>

        {view.cloud === 'error' && cloudError}

        {offline && (
          <div className={css.Banner}>
            <span style={{ fontSize: 26 }}>🌙</span>
            <div className={css.Grow}>
              <div className={css.Strong}>
                {tr('games.idle.offline_title', 'While you were away ({{time}})', {
                  time: formatDuration(offline.elapsedMs),
                })}
              </div>
              <div className={css.Muted}>
                {tr(
                  'games.idle.offline_text',
                  '{{kills}} enemies defeated · +{{gold}} gold · +{{xp}} XP · {{items}} items',
                  {
                    kills: formatBig(offline.kills),
                    gold: formatBig(offline.gold),
                    xp: formatBig(offline.xp),
                    items: offline.items + offline.sold,
                  }
                )}
                {offline.levels > 0 &&
                  ` · ${tr('games.idle.offline_levels', '+{{count}} levels', {
                    count: offline.levels,
                  })}`}
              </div>
            </div>
            <button type="button" className={css.Button} onClick={runner.dismissOffline}>
              {tr('games.idle.collect', 'Nice!')}
            </button>
          </div>
        )}

        <div className={css.Tabs} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={css.Tab}
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setError(undefined);
              }}
            >
              {t.label}
              {t.dot && <span className={css.Dot} />}
            </button>
          ))}
        </div>

        {tab === 'battle' && (
          <BattleView
            state={state}
            log={view.log}
            recent={view.recent}
            onAutoAdvance={(on) => run((s) => setAutoAdvance(s, on))}
            onGoToStage={(stage) => run((s) => goToStage(s, stage))}
          />
        )}
        {tab === 'hero' && (
          <>
            <HeroView
              state={state}
              error={error}
              onAllocate={(a) => run((s) => allocate(s, a))}
              onUnequip={(slot) => run((s) => unequip(s, slot))}
            />
            <div className={css.Row}>
              {confirmAbandon ? (
                <>
                  <span className={css.Muted}>
                    {tr('games.idle.abandon_confirm', 'This deletes your hero for good. Sure?')}
                  </span>
                  <button
                    type="button"
                    className={css.DangerButton}
                    onClick={() => {
                      runner.abandon();
                      setConfirmAbandon(false);
                      setTab('battle');
                    }}
                  >
                    {tr('games.idle.abandon_yes', 'Yes, start over')}
                  </button>
                  <button
                    type="button"
                    className={css.GhostButton}
                    onClick={() => setConfirmAbandon(false)}
                  >
                    {tr('games.idle.abandon_no', 'Keep my hero')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={css.DangerButton}
                  onClick={() => setConfirmAbandon(true)}
                >
                  {tr('games.idle.abandon', 'New hero')}
                </button>
              )}
            </div>
          </>
        )}
        {tab === 'backpack' && (
          <BackpackView
            state={state}
            error={error}
            onEquip={(id) => run((s) => equip(s, id))}
            onSell={(id) => run((s) => sell(s, id))}
            onSellUpTo={(r) => run((s) => sellUpTo(s, r))}
            onMove={(id, x, y, rotated) => run((s) => move(s, id, x, y, rotated))}
            onRotate={(id) => run((s) => rotate(s, id))}
          />
        )}
        {tab === 'upgrades' && (
          <UpgradesView state={state} onBuy={(id) => run((s) => buyUpgrade(s, id))} />
        )}
        {tab === 'arena' && (
          <ArenaView
            state={state}
            userId={userId}
            onFight={(rival) => {
              const { state: next, result } = fightRival(state, userId, rival);
              runner.replace(next);
              return result;
            }}
          />
        )}
      </div>
    </div>
  );
}
