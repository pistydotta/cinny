import React, { useState } from 'react';
import { Segmented } from '../../forge-theme/Segmented';
import { tr } from '../../translation/tr';
import { League, TEAMS, teamById } from './engine/teams';
import { Shirt } from './MatchHud';
import * as css from './football.css';

// Pick a team: Brasileirão or national teams, each with its kit and rating.
export function TeamPicker({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const chosen = teamById(value);
  const [league, setLeague] = useState<League>(chosen.league);
  return (
    <div className={css.Picker}>
      <div className={css.PickerHead}>
        <span className={css.Label}>{title}</span>
        <Segmented<League>
          label={title}
          value={league}
          onChange={setLeague}
          options={[
            { value: 'br', name: tr('football.league.br', 'Brasileirão') },
            { value: 'nation', name: tr('football.league.nation', 'National teams') },
          ]}
        />
      </div>
      <div className={css.Chosen}>
        <Shirt team={chosen} big />
        <span>{chosen.name}</span>
      </div>
      <div className={css.TeamList}>
        {TEAMS.filter((t) => t.league === league).map((t) => (
          <button
            key={t.id}
            type="button"
            className={css.TeamButton}
            aria-pressed={t.id === value}
            onClick={() => onChange(t.id)}
          >
            <Shirt team={t} />
            <span className={css.TeamName}>{t.name}</span>
            <span className={css.Rating}>{t.rating}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
