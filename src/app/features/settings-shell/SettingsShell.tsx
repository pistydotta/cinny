import React, { ReactNode, useEffect, useState } from 'react';
import { Icon, Icons, IconSrc, Text } from 'folds';
import { TipIconButton } from '../tooltips/TipIconButton';
import { tr } from '../translation/tr';
import * as css from './settingsShell.css';

export type SettingsTabItem<T> = {
  page: T;
  name: string;
  icon: IconSrc;
};

const ROW = css.rowSelector;

// Hides the rows of the open tab that don't mention the query, and any section left empty.
// It works on what is on screen, so it also catches rows a page loads later.
function useRowFilter(body: HTMLElement | null, query: string): boolean {
  const [anyMatch, setAnyMatch] = useState(true);

  useEffect(() => {
    if (!body) return undefined;
    const needle = query.trim().toLocaleLowerCase();

    const apply = () => {
      body.querySelectorAll('[data-search-hidden]').forEach((el) => {
        el.removeAttribute('data-search-hidden');
      });
      if (!needle) {
        setAnyMatch(true);
        return;
      }
      const rows = Array.from(body.querySelectorAll<HTMLElement>(ROW)).filter(
        (row) => !row.parentElement?.closest(ROW)
      );
      let matches = 0;
      rows.forEach((row) => {
        if ((row.textContent ?? '').toLocaleLowerCase().includes(needle)) matches += 1;
        else row.setAttribute('data-search-hidden', '');
      });
      body.querySelectorAll<HTMLElement>(`div:has(> ${ROW})`).forEach((section) => {
        const sectionTitle = section.firstElementChild?.textContent ?? '';
        if (sectionTitle.toLocaleLowerCase().includes(needle)) {
          section.querySelectorAll(':scope > [data-search-hidden]').forEach((row) => {
            row.removeAttribute('data-search-hidden');
            matches += 1;
          });
        } else if (!section.querySelector(`:scope > ${ROW}:not([data-search-hidden])`)) {
          section.setAttribute('data-search-hidden', '');
        }
      });
      setAnyMatch(matches > 0);
    };

    apply();
    if (!needle) return undefined;
    const observer = new MutationObserver(apply);
    observer.observe(body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [body, query]);

  return anyMatch;
}

const scrollParent = (el: HTMLElement, stop: HTMLElement): HTMLElement => {
  let node = el.parentElement;
  while (node && node !== stop) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return stop;
};

// Marks the section being read: the last one scrolled up to near where the first section
// starts. The sections near the end never get there, so the last stretch of scrolling is split
// evenly between them and each gets a turn.
function useActiveSection(body: HTMLElement | null, page: unknown) {
  useEffect(() => {
    if (!body) return undefined;
    let frame = 0;
    let hovered: HTMLElement | null = null;

    const mark = () => {
      frame = 0;
      const sections = Array.from(body.querySelectorAll<HTMLElement>(css.sectionSelector)).filter(
        (el) => el.offsetParent !== null
      );
      if (sections.length === 0) return;
      const scroller = scrollParent(sections[0], body);
      const view = scroller.getBoundingClientRect();
      const { scrollTop } = scroller;
      const maxScroll = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
      // The scroll position at which each section's top reaches where the first one starts, less
      // a little lead so a section takes over just before it reaches the top.
      const firstTop = sections[0].getBoundingClientRect().top;
      const lead = view.height * 0.15;
      const anchors = sections.map((el, i) =>
        i === 0 ? 0 : Math.max(el.getBoundingClientRect().top - firstTop - lead, 1)
      );
      const lastAt = (pos: number) =>
        anchors.reduce((found, anchor, i) => (anchor <= pos ? i : found), 0);

      const tailStart = Math.max(0, maxScroll - view.height * 0.65);
      let index: number;
      if (scrollTop < tailStart || maxScroll === 0) index = lastAt(scrollTop);
      else {
        const first = lastAt(tailStart);
        const count = sections.length - first;
        const slice = (maxScroll - tailStart) / count;
        index = first + Math.min(Math.floor((scrollTop - tailStart) / slice), count - 1);
      }
      // A tab that doesn't scroll has nothing to follow, so the mark follows the pointer there.
      const active =
        maxScroll === 0 && hovered && sections.includes(hovered) ? hovered : sections[index];
      sections.forEach((el) => {
        if (el === active) el.setAttribute('data-active', '');
        else el.removeAttribute('data-active');
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(mark);
    };

    const onPointer = (evt: PointerEvent) => {
      const target = evt.target instanceof Element ? evt.target : null;
      const section = target?.closest<HTMLElement>(css.sectionSelector) ?? null;
      // The gaps between sections keep the last one, so the mark doesn't flicker back to 01.
      if (section && section !== hovered) {
        hovered = section;
        schedule();
      }
    };

    schedule();
    body.addEventListener('scroll', schedule, true);
    body.addEventListener('pointerover', onPointer);
    const observer = new MutationObserver(schedule);
    observer.observe(body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      body.removeEventListener('scroll', schedule, true);
      body.removeEventListener('pointerover', onPointer);
      observer.disconnect();
    };
  }, [body, page]);
}

type SettingsShellProps<T> = {
  tabs: SettingsTabItem<T>[];
  activePage: T;
  onSelect: (page: T) => void;
  requestClose: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function SettingsShell<T>({
  tabs,
  activePage,
  onSelect,
  requestClose,
  onLogout,
  children,
}: SettingsShellProps<T>) {
  const [query, setQuery] = useState('');
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const anyMatch = useRowFilter(body, query);
  useActiveSection(body, activePage);

  return (
    <div className={css.Shell}>
      <div className={css.Bar}>
        <div className={css.BarTop}>
          <Text as="h1" size="H4" className={css.Title}>
            {tr('settings.title', 'Settings')}
          </Text>
          <div className={css.Search}>
            <Icon size="100" src={Icons.Search} />
            <input
              className={css.SearchInput}
              type="search"
              value={query}
              placeholder={tr('settings.search', 'Search')}
              aria-label={tr('settings.search_label', 'Search this tab')}
              onChange={(evt) => setQuery(evt.target.value)}
              onKeyDown={(evt) => {
                if (evt.key === 'Escape' && query) {
                  evt.stopPropagation();
                  setQuery('');
                }
              }}
            />
          </div>
          <TipIconButton
            label={tr('settings.logout', 'Log out')}
            variant="Surface"
            onClick={onLogout}
          >
            <Icon src={Icons.Power} />
          </TipIconButton>
          <TipIconButton
            label={tr('settings.close', 'Close')}
            variant="Surface"
            onClick={requestClose}
          >
            <Icon src={Icons.Cross} />
          </TipIconButton>
        </div>
        <div className={css.Tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              type="button"
              role="tab"
              className={css.Tab}
              aria-selected={tab.page === activePage}
              onClick={() => {
                setQuery('');
                onSelect(tab.page);
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>
      {!anyMatch && (
        <Text className={css.Empty} size="T300">
          {tr('settings.no_results', 'Nothing on this tab matches your search.')}
        </Text>
      )}
      <div className={css.Body} ref={setBody}>
        {children}
      </div>
    </div>
  );
}
