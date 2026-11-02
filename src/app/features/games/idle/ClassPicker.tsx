import React, { FormEvent, useState } from 'react';
import { CLASSES, getClass } from './engine/classes';
import { ClassId } from './engine/types';
import { attrName, classDesc, className, effectText, roleName, skillName } from './labels';
import * as css from './idle.css';
import { tr } from '../../translation/tr';

type ClassPickerProps = {
  defaultName: string;
  onStart: (name: string, classId: ClassId) => void;
};

export function ClassPicker({ defaultName, onStart }: ClassPickerProps) {
  const [picked, setPicked] = useState<ClassId>();
  const [name, setName] = useState(defaultName.slice(0, 24));
  const cls = picked ? getClass(picked) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (picked && name.trim()) onStart(name.trim(), picked);
  };

  return (
    <div className={css.Panel}>
      <h2 className={css.PanelTitle}>{tr('games.idle.pick.title', 'Choose your class')}</h2>
      <p className={css.Muted} style={{ margin: 0 }}>
        {tr(
          'games.idle.pick.text',
          'Your hero fights on their own, even with the game closed. You pick the gear, the points and when to push further.'
        )}
      </p>
      <div className={css.ClassGrid}>
        {CLASSES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={css.ClassCard}
            aria-pressed={picked === c.id}
            style={{ borderColor: picked === c.id ? c.color : undefined }}
            onClick={() => setPicked(c.id)}
          >
            <span className={css.ClassIcon}>{c.icon}</span>
            <span className={css.Strong} style={{ color: c.color }}>
              {className(c.id)}
            </span>
            <span className={css.Muted}>
              {roleName(c.role)} · {attrName(c.mainStat)}
            </span>
          </button>
        ))}
      </div>

      {cls && (
        <form className={css.ItemBox} style={{ borderColor: cls.color }} onSubmit={submit}>
          <span className={css.ItemName} style={{ color: cls.color }}>
            {cls.icon} {className(cls.id)}
          </span>
          <span className={css.Muted}>{classDesc(cls.id)}</span>
          <span style={{ fontSize: 13 }}>
            <b>{skillName(cls.skill.id)}</b>
            {' — '}
            {cls.skill.effects.map(effectText).join(' · ')}
            {' · '}
            {tr('games.idle.cooldown', '{{sec}}s cooldown', { sec: cls.skill.cooldownMs / 1000 })}
          </span>
          <div className={css.Row}>
            <input
              className={css.Input}
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              aria-label={tr('games.idle.pick.name', 'Hero name')}
              placeholder={tr('games.idle.pick.name', 'Hero name')}
            />
            <button type="submit" className={css.Button} disabled={!name.trim()}>
              {tr('games.idle.pick.start', 'Begin the journey')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
