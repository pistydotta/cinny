import React from 'react';
import { resetTalentsCost } from './engine/actions';
import { availableTalentPoints } from './engine/progress';
import { TalentDef, BRANCHES, ROW_NEEDS, talentsFor, rowOpen, spentIn } from './engine/talents';
import { getClass } from './engine/classes';
import { GameState } from './engine/types';
import { formatBig } from './format';
import { branchDesc, branchName, modsText, talentName, className, specName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type TalentsViewProps = {
  state: GameState;
  error?: string;
  onLearn: (id: string) => void;
  onReset: () => void;
};

export function TalentsView({ state, error, onLearn, onReset }: TalentsViewProps) {
  const points = availableTalentPoints(state);
  const { talents } = state.hero;
  const available = talentsFor(state.hero);
  const heading = (branch: string) => {
    if (branch === 'fury') return className(state.hero.classId);
    if (branch === 'bulwark')
      return state.hero.specId
        ? specName(state.hero.specId)
        : tr('games.idle.specialization_path', 'Specialization');
    return branchName('fortune');
  };
  const description = (branch: string) => {
    if (branch === 'fortune') return branchDesc('fortune');
    if (branch === 'fury') return tr('games.idle.class_path', 'Exclusive class combat talents');
    if (state.hero.specId)
      return tr('games.idle.spec_path', 'Strengthen your specialization passive');
    return getClass(state.hero.classId)
      .specs.map((sp) => specName(sp.id))
      .join(' / ');
  };
  const nodeName = (t: TalentDef) => {
    if (t.specId)
      return tr('games.idle.spec_talent', '{{spec}} · {{stat}}', {
        spec: specName(t.specId),
        stat: modsText(t.perRank),
      });
    return t.name ? tr(`games.idle.talent.${t.id}`, t.name) : talentName(t.id);
  };

  return (
    <div className={css.Panel}>
      <div className={css.Row} style={{ justifyContent: 'space-between' }}>
        <h2 className={css.PanelTitle}>🌟 {tr('games.idle.talents', 'Talents')}</h2>
        <div className={css.Row}>
          <span className={css.Pill} style={{ color: points > 0 ? '#ffd36b' : undefined }}>
            {tr('games.idle.talent_points', '{{count}} points', { count: points })}
          </span>
          <button
            type="button"
            className={css.GhostButton}
            style={{ height: 32 }}
            disabled={Object.keys(talents).length === 0}
            onClick={onReset}
          >
            ↺{' '}
            {tr('games.idle.talent_reset', 'Reset (🪙 {{gold}})', {
              gold: formatBig(resetTalentsCost(state)),
            })}
          </button>
        </div>
      </div>
      <span className={css.Muted}>
        {tr(
          'games.idle.class_tree_hint',
          'One point per level. Your class has its own combat path. Choose a specialization at level 30 for a second path. Fortune is shared. Spend 5 points in a path to open its next row; rebirth refunds points.'
        )}
      </span>
      {error && <p className={css.ErrorText}>{error}</p>}
      <div className={css.TalentCols}>
        {BRANCHES.map((branch) => {
          const spent = spentIn(talents, branch);
          return (
            <div key={branch} className={css.List} style={{ gap: 6 }}>
              <div>
                <div className={css.Strong}>
                  {heading(branch)} <span className={css.Muted}>· {spent}</span>
                </div>
                <div className={css.Mini}>{description(branch)}</div>
              </div>
              {ROW_NEEDS.map((need, row) => {
                const defs = available.filter((t) => t.branch === branch && t.row === row);
                if (!defs.length) return null;
                const open = spent >= need;
                return (
                  <React.Fragment key={`${branch}-${need}`}>
                    {row > 0 && (
                      <span
                        className={css.RowLabel}
                        style={{ color: open ? '#8be28f' : undefined }}
                      >
                        {open
                          ? tr('games.idle.row_open', 'Row {{row}}', { row: row + 1 })
                          : tr(
                              'games.idle.row_locked',
                              'Row {{row}} · {{need}} points in {{branch}}',
                              {
                                row: row + 1,
                                need,
                                branch: heading(branch),
                              }
                            )}
                      </span>
                    )}
                    {defs.map((t) => {
                      const rank = talents[t.id] ?? 0;
                      const maxed = rank >= t.maxRank;
                      const can = points > 0 && rowOpen(talents, t) && !maxed;
                      const total: Record<string, number> = {};
                      Object.entries(t.perRank).forEach(([k, v]) => {
                        total[k] = (v ?? 0) * Math.max(1, rank);
                      });
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={css.TalentNode}
                          disabled={!can && !maxed && rank === 0}
                          data-maxed={maxed}
                          data-ranked={rank > 0}
                          onClick={() => can && onLearn(t.id)}
                          title={can ? tr('games.idle.talent_learn', 'Add a point') : undefined}
                        >
                          <span className={css.TalentIcon}>{t.icon}</span>
                          <span className={css.Grow}>
                            <span className={css.Strong} style={{ fontSize: 14 }}>
                              {nodeName(t)}
                            </span>
                            <span className={css.Mini} style={{ display: 'block' }}>
                              {rank > 0
                                ? modsText(total)
                                : tr('games.idle.per_rank', '{{mods}} per point', {
                                    mods: modsText(t.perRank),
                                  })}
                            </span>
                            {!maxed && (
                              <span
                                className={css.Mini}
                                style={{ display: 'block', color: '#8be28f' }}
                              >
                                {tr('games.idle.next_point', 'Next point: {{mods}}', {
                                  mods: modsText(t.perRank),
                                })}
                              </span>
                            )}
                          </span>
                          <span
                            className={css.StatValue}
                            style={{ color: maxed ? '#ffd36b' : undefined }}
                          >
                            {rank}/{t.maxRank}
                          </span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
