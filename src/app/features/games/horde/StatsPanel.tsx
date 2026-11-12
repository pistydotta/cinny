import React, { useState } from 'react';
import { STATS, STAT_IDS, StatGroup, StatId, Stats } from './engine/stats';
import { formatStat, groupName, statText } from './statLabels';
import { PixelIcon } from './icons/PixelIcon';
import * as css from './horde.css';
import { tr } from '../../translation/tr';

const GROUPS: StatGroup[] = ['defense', 'attack', 'weapons', 'movement', 'economy'];

type StatsPanelProps = {
  stats: Stats;
  title: string;
  onClose: () => void;
};

// Every stat with its value now, in the groups of the table. Hovering or tapping a stat says what
// it does.
export function StatsPanel({ stats, title, onClose }: StatsPanelProps) {
  const [open, setOpen] = useState<StatId>();
  return (
    <>
      <h2 className={css.PanelTitle}>{title}</h2>
      <div className={css.StatGroups}>
        {GROUPS.map((group) => (
          <section key={group} className={css.StatGroup}>
            <h3 className={css.StatGroupTitle}>{groupName(group)}</h3>
            {STAT_IDS.filter((id) => STATS[id].group === group).map((id) => {
              const text = statText(id);
              const changed = Math.abs(stats[id] - STATS[id].base) > 1e-9;
              return (
                <button
                  key={id}
                  type="button"
                  className={css.StatRow}
                  title={text.text}
                  data-changed={changed}
                  onClick={() => setOpen(open === id ? undefined : id)}
                >
                  <span className={css.StatLine}>
                    <PixelIcon art={text.art} emoji={text.icon} />
                    <span className={css.Grow}>{text.name}</span>
                    <span className={css.StatNumber}>{formatStat(id, stats[id])}</span>
                  </span>
                  {open === id && <span className={css.StatHelp}>{text.text}</span>}
                </button>
              );
            })}
          </section>
        ))}
      </div>
      <div className={css.PanelRow}>
        <button type="button" className={css.PlayButton} onClick={onClose}>
          {tr('games.horde.done', 'Done')}
        </button>
      </div>
    </>
  );
}
