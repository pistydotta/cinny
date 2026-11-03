import React from 'react';
import { resetTalentsCost } from './engine/actions';
import { availableTalentPoints } from './engine/progress';
import { BRANCHES, ROW_NEEDS, TALENTS, rowOpen, spentIn } from './engine/talents';
import { GameState } from './engine/types';
import { formatBig } from './format';
import { branchDesc, branchName, modsText, talentName } from './labels';
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
          'games.idle.talents_hint',
          'One point per level. Deeper rows open as you put points in their branch. The last row of each branch never runs out: the tree takes several rebirths to fill. Points come back on a rebirth.'
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
                  {branchName(branch)} <span className={css.Muted}>· {spent}</span>
                </div>
                <div className={css.Mini}>{branchDesc(branch)}</div>
              </div>
              {ROW_NEEDS.map((need, row) => {
                const defs = TALENTS.filter((t) => t.branch === branch && t.row === row);
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
                                branch: branchName(branch),
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
                              {talentName(t.id)}
                            </span>
                            <span className={css.Mini} style={{ display: 'block' }}>
                              {rank > 0
                                ? modsText(total)
                                : tr('games.idle.per_rank', '{{mods}} per point', {
                                    mods: modsText(t.perRank),
                                  })}
                            </span>
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
