import React, { useCallback, useState } from 'react';
import { Icon, Icons } from 'folds';
import {
  ActionError,
  ActionResult,
  buyAltar,
  buyUpgrade,
  bulkClear,
  canRebirth,
  chooseSpec,
  equip,
  equipBest,
  forge,
  goToStage,
  learnTalent,
  markSeen,
  rebirth,
  resetTalents,
  salvage,
  sell,
  setAutoAdvance,
  setAutoSalvage,
  toggleLock,
  unequip,
} from './engine/actions';
import { fightRival } from './engine/arena';
import { SPEC_LEVEL, getClass, looksOf } from './engine/classes';
import { availableTalentPoints, xpToNext } from './engine/progress';
import { GameState } from './engine/types';
import { formatBig, formatDuration } from './format';
import { className, specName } from './labels';
import { newCount } from './itemView';
import { useIdleGame } from './useIdleGame';
import { ClassPicker } from './ClassPicker';
import { BattleView } from './BattleView';
import { HeroView } from './HeroView';
import { InventoryView } from './InventoryView';
import { ForgeView } from './ForgeView';
import { TalentsView } from './TalentsView';
import { UpgradesView } from './UpgradesView';
import { RebirthView } from './RebirthView';
import { ArenaView } from './ArenaView';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type TabId =
  | 'battle'
  | 'hero'
  | 'talents'
  | 'backpack'
  | 'forge'
  | 'upgrades'
  | 'rebirth'
  | 'arena';

const errorText = (e: ActionError): string => {
  switch (e) {
    case 'bag_full':
      return tr('games.idle.error.bag_full', 'There is no room in the backpack for that.');
    case 'not_enough_gold':
      return tr('games.idle.error.gold', 'Not enough gold.');
    case 'not_enough_materials':
      return tr('games.idle.error.materials', 'Not enough materials.');
    case 'maxed':
      return tr('games.idle.error.maxed', 'Already at the top level.');
    case 'no_points':
      return tr('games.idle.error.points', 'No points to spend.');
    case 'locked':
      return tr('games.idle.error.locked', 'This item is locked. Unlock it first.');
    case 'too_early':
      return tr('games.idle.error.too_early', 'Not yet.');
    case 'nothing':
      return tr('games.idle.error.nothing', 'Nothing to do there.');
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
  const { runner, view } = useIdleGame(userId);
  const [tab, setTab] = useState<TabId>('battle');
  const [error, setError] = useState<string>();
  const [forgeItem, setForgeItem] = useState<string>();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const { state, offline } = view;

  const run = (action: (s: GameState) => ActionResult) => {
    const result = runner.dispatch(action);
    setError(result && !result.ok ? errorText(result.error) : undefined);
  };
  const onSeen = useCallback(() => {
    runner.dispatch(markSeen);
  }, [runner]);
  const openForge = (id: string) => {
    setForgeItem(id);
    setTab('forge');
    setError(undefined);
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
        <div className={css.Row}>
          <span className={css.Pill} title={tr('games.idle.gold', 'Gold')}>
            🪙 <span className={css.GoldText}>{formatBig(state.gold)}</span>
          </span>
          <span className={css.Pill} title={tr('games.idle.stones', 'Ember stones')}>
            🔶 {formatBig(state.materials.stones)}
          </span>
          <span className={css.Pill} title={tr('games.idle.cores', 'Fire cores')}>
            🔥 {state.materials.cores}
          </span>
          {state.prestige.ashesEarned > 0 && (
            <span className={css.Pill} title={tr('games.idle.ashes_title', 'Eternal ashes')}>
              ✴️ {state.prestige.ashes}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!state) {
    return (
      <div className={css.Page}>
        <div className={css.Inner}>
          {header}
          <ClassPicker defaultName={defaultName} onStart={runner.start} wiped={view.wiped} />
        </div>
      </div>
    );
  }

  const cls = getClass(state.hero.classId);
  const look = looksOf(cls, state.hero.specId);
  const need = xpToNext(state.hero.level);
  const points = availableTalentPoints(state);
  const fresh = newCount(state);
  const tabs: { id: TabId; label: string; dot?: boolean; count?: number }[] = [
    { id: 'battle', label: `⚔️ ${tr('games.idle.tab.battle', 'Battle')}` },
    {
      id: 'hero',
      label: `🧙 ${tr('games.idle.tab.hero', 'Hero')}`,
      dot: !state.hero.specId && state.hero.level >= SPEC_LEVEL,
    },
    { id: 'talents', label: `🌟 ${tr('games.idle.tab.talents', 'Talents')}`, count: points },
    { id: 'backpack', label: `🎒 ${tr('games.idle.tab.backpack', 'Backpack')}`, count: fresh },
    { id: 'forge', label: `⚒️ ${tr('games.idle.tab.forge', 'Forge')}` },
    { id: 'upgrades', label: `📈 ${tr('games.idle.tab.upgrades', 'Training')}` },
    {
      id: 'rebirth',
      label: `🔥 ${tr('games.idle.tab.rebirth', 'Rebirth')}`,
      dot: canRebirth(state),
    },
    { id: 'arena', label: `🏆 ${tr('games.idle.tab.arena', 'Arena')}` },
  ];

  return (
    <div className={css.Page}>
      <div className={css.Inner}>
        {header}

        <div className={css.HeroBar}>
          <span className={css.Portrait} style={{ background: `${look.color}33` }}>
            {look.icon}
          </span>
          <div className={css.Grow}>
            <div className={css.HeroName}>
              {state.hero.name}{' '}
              <span className={css.Muted}>
                · {state.hero.specId ? specName(state.hero.specId) : className(cls.id)} ·{' '}
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
          {state.prestige.rebirths > 0 && (
            <span className={css.Pill} style={{ color: '#ffb06b' }}>
              🔥 {state.prestige.rebirths}
            </span>
          )}
        </div>

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
                  '{{kills}} enemies defeated · +{{gold}} gold · +{{xp}} XP · {{items}} items · +{{stones}} 🔶',
                  {
                    kills: formatBig(offline.kills),
                    gold: formatBig(offline.gold),
                    xp: formatBig(offline.xp),
                    items: offline.items,
                    stones: formatBig(offline.stones),
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
              {!!t.count && (
                <span className={css.Badge} style={{ background: '#ff5a4f', color: '#fff' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'battle' && (
          <BattleView
            state={state}
            log={view.log}
            runner={runner}
            onAutoAdvance={(on) => run((s) => setAutoAdvance(s, on))}
            onGoToStage={(stage) => run((s) => goToStage(s, stage))}
          />
        )}
        {tab === 'hero' && (
          <>
            <HeroView
              state={state}
              error={error}
              onUnequip={(slot) => run((s) => unequip(s, slot))}
              onSpec={(id) => run((s) => chooseSpec(s, id))}
              onForge={openForge}
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
        {tab === 'talents' && (
          <TalentsView
            state={state}
            error={error}
            onLearn={(id) => run((s) => learnTalent(s, id))}
            onReset={() => run(resetTalents)}
          />
        )}
        {tab === 'backpack' && (
          <InventoryView
            state={state}
            error={error}
            onEquip={(id) => run((s) => equip(s, id))}
            onEquipBest={() => run(equipBest)}
            onSell={(id) => run((s) => sell(s, id))}
            onSalvage={(id) => run((s) => salvage(s, id))}
            onLock={(id) => run((s) => toggleLock(s, id))}
            onBulk={(r, how) => run((s) => bulkClear(s, r, how))}
            onAutoSalvage={(r) => run((s) => setAutoSalvage(s, r))}
            onForge={openForge}
            onSeen={onSeen}
          />
        )}
        {tab === 'forge' && (
          <ForgeView
            state={state}
            error={error}
            selected={forgeItem}
            onSelect={(id) => {
              setForgeItem(id);
              setError(undefined);
            }}
            onForge={(id) => {
              const result = forge(state, id);
              if (!result.ok) {
                setError(errorText(result.error));
                return undefined;
              }
              setError(undefined);
              runner.replace(result.state);
              return { outcome: result.outcome, plus: result.plus };
            }}
          />
        )}
        {tab === 'upgrades' && (
          <UpgradesView state={state} onBuy={(id) => run((s) => buyUpgrade(s, id))} />
        )}
        {tab === 'rebirth' && (
          <RebirthView
            state={state}
            error={error}
            onRebirth={() => run(rebirth)}
            onBuy={(id) => run((s) => buyAltar(s, id))}
          />
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
