import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useToast } from '../../components/toast';
import { callEmbedAtom } from '../../state/callEmbed';
import { getMxIdLocalPart } from '../../utils/matrix';
import { PlaybookApi } from './api';
import { howText, KIND_COLOR, kindLabel, PlaybookItem, PlaybookMap } from './model';
import { Radar } from './Radar';
import { VideoPlayer } from './VideoPlayer';
import { useFileUrl } from './usePlaybook';
import { playbookEditPath, playbookItemPath, playbookMapPath, savedFilters } from './paths';
import { uploadError } from './upload';
import * as css from './playbook.css';

const extraLabel = (k: 'stand' | 'aim' | 'result') =>
  ({
    stand: tr('playbook.tab.stand', 'Where to stand'),
    aim: tr('playbook.tab.aim', 'Where to aim'),
    result: tr('playbook.tab.result', 'Where it lands'),
  }[k]);

// A screenshot at full resolution. A click zooms 2x where clicked (for the exact pixel), another
// click goes back.
function Picture({ api, id, label }: { api: PlaybookApi; id: string; label: string }) {
  const url = useFileUrl(api, id);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => setZoom(null), [id]);
  return (
    <div className={css.Stage}>
      {url ? (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <img
          className={`${css.StageMedia} ${zoom ? css.Zoomed : css.Zoomable}`}
          style={zoom ? { transformOrigin: `${zoom.x * 100}% ${zoom.y * 100}%` } : undefined}
          src={url}
          alt={label}
          onClick={(e) => {
            if (zoom) setZoom(null);
            else {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
            }
          }}
        />
      ) : (
        <div className={css.StageNote}>{tr('playbook.loading', 'Loading…')}</div>
      )}
    </div>
  );
}

type ItemViewProps = {
  api: PlaybookApi;
  map: PlaybookMap;
  itemId: string;
};

// Just the video: the photo is what people saw on the map's card before opening it.
export function ItemView({ api, map, itemId }: ItemViewProps) {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const toast = useToast();
  const call = useAtomValue(callEmbedAtom);
  const [item, setItem] = useState<PlaybookItem>();
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const videoUrl = useFileUrl(api, item?.video);
  const posterUrl = useFileUrl(api, item?.video, 'poster');

  useEffect(() => {
    let live = true;
    setItem(undefined);
    setError('');
    api.item(itemId).then(
      (i) => live && setItem(i),
      () => live && setError(tr('playbook.error.item', "This item doesn't exist or was deleted."))
    );
    return () => {
      live = false;
    };
  }, [api, itemId]);

  const back = useCallback(
    () => navigate(playbookMapPath(map.slug, savedFilters(map.slug) ?? '')),
    [navigate, map.slug]
  );

  // Esc goes back to the map (the player has its own keys); not while fullscreen, where Esc
  // only leaves fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Escape' && !document.fullscreenElement) back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);

  const link = item ? `${window.location.origin}${playbookItemPath(map.slug, item.id)}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(tr('playbook.link_copied', 'Link copied'));
    } catch {
      toast(tr('playbook.link_failed', "Couldn't copy the link"), 'Critical');
    }
  };

  // In a call, it goes to the call's room chat; otherwise the link is copied to paste anywhere.
  const sendToChat = async () => {
    if (!item) return;
    if (!call) {
      await copyLink();
      return;
    }
    try {
      await mx.sendMessage(call.roomId, {
        msgtype: 'm.text',
        body: `${item.name} (${map.name}) — ${link}`,
      } as never);
      toast(tr('playbook.sent', 'Sent to the call chat'));
    } catch {
      toast(tr('playbook.send_failed', "Couldn't send it to the chat"), 'Critical');
    }
  };

  const remove = async () => {
    if (!item) return;
    try {
      await api.remove(item.id);
      toast(tr('playbook.deleted', 'Deleted'));
      back();
    } catch (e) {
      toast(uploadError(e), 'Critical');
    }
  };

  if (error)
    return (
      <div className={css.Empty}>
        <p className={css.Error}>{error}</p>
        <button type="button" className={css.Button} onClick={back}>
          {tr('playbook.back_to_map', 'Back to {{map}}', { map: map.name })}
        </button>
      </div>
    );
  if (!item) return <p className={css.Muted}>{tr('playbook.loading', 'Loading…')}</p>;

  const author =
    mx.getUser(item.author)?.displayName || getMxIdLocalPart(item.author) || item.author;
  const how = howText(item);
  const extras = (['stand', 'aim', 'result'] as const).filter((k) => item[k]);
  const onRadar = !!(map.radar && item.from);

  return (
    <>
      <div className={css.Toolbar}>
        <button
          type="button"
          className={css.Button}
          onClick={back}
          aria-label={tr('playbook.back_to_map', 'Back to {{map}}', { map: map.name })}
        >
          <Icon size="100" src={Icons.ArrowLeft} />
          {map.name}
        </button>
        <span className={css.Grow} />
        <button type="button" className={css.Button} onClick={copyLink}>
          <Icon size="100" src={Icons.Link} />
          {tr('playbook.copy_link', 'Copy link')}
        </button>
        <button type="button" className={css.Button} onClick={sendToChat}>
          <Icon size="100" src={Icons.Send} />
          {call
            ? tr('playbook.send_to_call', 'Send to call chat')
            : tr('playbook.send_link', 'Share link')}
        </button>
      </div>

      <div>
        <h1 className={css.How}>{item.name}</h1>
        <p className={`${css.Muted} ${css.CardMeta}`} style={{ padding: 0, marginTop: 6 }}>
          <span className={css.Dot} style={{ background: KIND_COLOR[item.kind] }} />
          {kindLabel(item.kind)} · {item.side} · {item.area}
          {how ? ` · ${how}` : ''}
        </p>
      </div>

      <div className={onRadar ? css.ItemLayout : undefined}>
        <div className={css.Section}>
          {item.note && <p className={css.Note}>{item.note}</p>}

          <VideoPlayer src={videoUrl} poster={posterUrl} />

          {extras.length > 0 && (
            <>
              <h2 className={css.SectionTitle}>{tr('playbook.more_shots', 'More screenshots')}</h2>
              <div className={css.Extras}>
                {extras.map((k) => (
                  <div key={k} className={css.Section}>
                    <span className={`${css.Muted} ${css.Small}`}>{extraLabel(k)}</span>
                    <Picture api={api} id={item[k] as string} label={extraLabel(k)} />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={css.Toolbar}>
            <span className={`${css.Muted} ${css.Small}`}>
              {tr('playbook.added_by', 'Added by {{name}}', { name: author })}
            </span>
            <span className={css.Grow} />
            {item.canEdit && (
              <>
                <button
                  type="button"
                  className={css.Button}
                  onClick={() => navigate(playbookEditPath(map.slug, item.id))}
                >
                  <Icon size="100" src={Icons.Pencil} />
                  {tr('playbook.edit', 'Edit')}
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      className={`${css.Button} ${css.Danger}`}
                      onClick={remove}
                    >
                      {tr('playbook.confirm_delete', 'Delete for everyone')}
                    </button>
                    <button
                      type="button"
                      className={css.Button}
                      onClick={() => setConfirmDelete(false)}
                    >
                      {tr('playbook.cancel', 'Cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={`${css.Button} ${css.Danger}`}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Icon size="100" src={Icons.Delete} />
                    {tr('playbook.delete', 'Delete')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {onRadar && (
          <div className={css.Section}>
            <Radar api={api} map={map} pins={[item]} hot={item.id} />
          </div>
        )}
      </div>
    </>
  );
}
