import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Icons } from 'folds';
import { tr } from '../translation/tr';
import { useToast } from '../../components/toast';
import { ApiError } from '../../utils/blazeroomApi';
import { ItemInput, MediaType, PlaybookApi } from './api';
import {
  KIND_COLOR,
  KINDS,
  Kind,
  PlaybookItem,
  PlaybookMap,
  Point,
  SIDES,
  Side,
  TECHNIQUES,
  Technique,
  kindLabel,
  techniqueLabel,
} from './model';
import { Radar } from './Radar';
import { useFileUrl } from './usePlaybook';
import { linkAndWait, uploadAndWait, uploadError } from './upload';
import { playbookItemPath, playbookMapPath } from './paths';
import * as css from './playbook.css';

type Slot = 'video' | 'cover' | 'stand' | 'aim' | 'result';
type Upload = { id?: string; sending?: number; processing?: boolean; error?: string };
// Ctrl+V fills these in order: the photo first, then the optional screenshots.
const IMAGE_SLOTS = ['cover', 'stand', 'aim', 'result'] as const;

const slotLabel = (s: Slot) =>
  ({
    video: tr('playbook.tab.video', 'Video'),
    cover: tr('playbook.cover', 'Photo of the play'),
    stand: tr('playbook.tab.stand', 'Where to stand'),
    aim: tr('playbook.tab.aim', 'Where to aim'),
    result: tr('playbook.tab.result', 'Where it lands'),
  }[s]);

function DropZone({
  api,
  slot,
  type,
  upload,
  missing,
  onFile,
  tall,
}: {
  api: PlaybookApi;
  slot: Slot;
  type: MediaType;
  upload: Upload;
  missing?: boolean;
  onFile: (f: File) => void;
  tall?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const imageUrl = useFileUrl(api, type === 'image' ? upload.id : null);
  const posterUrl = useFileUrl(api, type === 'video' ? upload.id : null, 'poster');
  const url = imageUrl ?? posterUrl;
  let status: string;
  if (upload.sending !== undefined && !upload.processing)
    status = tr('playbook.upload.sending', 'Sending {{n}}%', {
      n: Math.round(upload.sending * 100),
    });
  else if (upload.processing) status = tr('playbook.upload.processing', 'Processing…');
  else if (upload.id) status = tr('playbook.upload.replace', 'Click to replace');
  else if (type === 'video')
    status = tr('playbook.upload.video_hint', 'Or drop a video file here, or click to pick one');
  else status = tr('playbook.upload.image_hint', 'Paste (Ctrl+V), drop or click');

  return (
    <div className={css.Section}>
      <button
        type="button"
        className={css.Drop}
        data-slot={slot}
        data-over={over}
        data-missing={!!missing}
        style={tall ? { minHeight: 200 } : undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
      >
        {url && <img className={css.DropPreview} src={url} alt="" />}
        {type === 'image' && <strong className={css.DropLabel}>{slotLabel(slot)}</strong>}
        <span className={css.DropLabel}>{status}</span>
        {upload.sending !== undefined && !upload.processing && !upload.id && (
          <span className={css.Progress}>
            <span
              className={css.ProgressBar}
              style={{ display: 'block', width: `${upload.sending * 100}%` }}
            />
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept={type === 'video' ? 'video/*' : 'image/png,image/jpeg,image/webp'}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      {upload.error && (
        <p role="alert" className={css.Error}>
          {upload.error}
        </p>
      )}
    </div>
  );
}

type ItemFormProps = {
  api: PlaybookApi;
  map: PlaybookMap;
  itemId?: string;
};

export function ItemForm({ api, map, itemId }: ItemFormProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [loaded, setLoaded] = useState(!itemId);
  const [kind, setKind] = useState<Kind>('smoke');
  const [side, setSide] = useState<Side>('T');
  const [area, setArea] = useState(map.areas[0] ?? '');
  const [name, setName] = useState('');
  const [technique, setTechnique] = useState<Technique | ''>('');
  const [fromLabel, setFromLabel] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [files, setFiles] = useState<Record<Slot, Upload>>({
    video: {},
    cover: {},
    stand: {},
    aim: {},
    result: {},
  });
  const [from, setFrom] = useState<Point | null>(null);
  const [to, setTo] = useState<Point | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const form = useRef<HTMLDivElement>(null);
  const spot = kind === 'spot';

  useEffect(() => {
    if (!itemId) return;
    api.item(itemId).then(
      (i: PlaybookItem) => {
        setKind(i.kind);
        setSide(i.side);
        setArea(i.area);
        setName(i.name);
        setTechnique(i.technique ?? '');
        setFromLabel(i.fromLabel ?? '');
        setNote(i.note ?? '');
        setFiles({
          video: { id: i.video },
          cover: { id: i.cover ?? undefined },
          stand: { id: i.stand ?? undefined },
          aim: { id: i.aim ?? undefined },
          result: { id: i.result ?? undefined },
        });
        setFrom(i.from);
        setTo(i.to);
        setLoaded(true);
      },
      () => navigate(playbookMapPath(map.slug))
    );
  }, [api, itemId, map.slug, navigate]);

  // Leaving with unsaved work asks first (reload or closing the tab).
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setMissing([]);
    setSaveError('');
  };

  const track = async (
    slot: Slot,
    work: (onStage: (s: Partial<Upload>) => void) => Promise<string>
  ) => {
    touch();
    setFiles((f) => ({
      ...f,
      [slot]: { ...f[slot], sending: 0, processing: false, error: undefined },
    }));
    try {
      const id = await work((stage) =>
        setFiles((f) => ({ ...f, [slot]: { ...f[slot], ...stage } }))
      );
      setFiles((f) => ({ ...f, [slot]: { id } }));
      return true;
    } catch (e) {
      setFiles((f) => ({ ...f, [slot]: { id: f[slot].id, error: uploadError(e) } }));
      return false;
    }
  };

  const send = (slot: Slot, file: File) =>
    track(slot, (onStage) =>
      uploadAndWait(api, file, slot === 'video' ? 'video' : 'image', onStage)
    );

  const fetchLink = async () => {
    if (!link.trim()) return;
    if (await track('video', (onStage) => linkAndWait(api, link, onStage))) setLink('');
  };

  // Ctrl+V anywhere on the form: an empty image box with focus takes it, otherwise the next
  // empty one does (the photo first). With all full, the focused box is replaced. A pasted
  // YouTube link outside a text box goes to the video.
  useEffect(() => {
    const onPaste = (event: Event) => {
      const e = event as ClipboardEvent;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/')
      );
      if (!file) return;
      const focused = (document.activeElement as HTMLElement | null)?.dataset.slot as
        | Slot
        | undefined;
      const empty = (s: Slot) => !files[s].id && files[s].sending === undefined;
      const focusedImage = focused && focused !== 'video' ? focused : undefined;
      const target =
        (focusedImage && empty(focusedImage) ? focusedImage : IMAGE_SLOTS.find(empty)) ??
        focusedImage;
      if (!target) return;
      e.preventDefault();
      send(target, file);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  });

  // First click: where it's done from; second: where it lands (a spot needs one). Then again.
  const place = (p: Point) => {
    touch();
    if (spot || !from || to) {
      setFrom(p);
      setTo(null);
    } else setTo(p);
  };

  const busy = Object.values(files).some((f) => f.sending !== undefined && !f.id);

  const save = async () => {
    const m: string[] = [];
    if (!name.trim()) m.push(tr('playbook.missing.name', 'a description'));
    if (!files.video.id) m.push(tr('playbook.missing.video', 'the video'));
    setMissing(m);
    if (m.length) return;
    const input: ItemInput = {
      mapId: map.id,
      kind,
      side,
      area,
      name: name.trim(),
      technique: technique || null,
      fromLabel: fromLabel.trim() || null,
      note: note.trim() || null,
      video: files.video.id as string,
      cover: files.cover.id ?? null,
      stand: files.stand.id ?? null,
      aim: files.aim.id ?? null,
      result: files.result.id ?? null,
      from,
      to: spot ? null : to,
    };
    setSaving(true);
    try {
      const saved = itemId ? await api.update(itemId, input) : await api.create(input);
      setDirty(false);
      toast(tr('playbook.saved', 'Saved to the Playbook'));
      navigate(playbookItemPath(map.slug, saved.id), { replace: true });
    } catch (e) {
      setSaveError(
        e instanceof ApiError && e.code === 'media_not_ready'
          ? tr('playbook.wait_uploads', 'Wait for the uploads to finish.')
          : uploadError(e)
      );
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    // eslint-disable-next-line no-alert
    if (dirty && !window.confirm(tr('playbook.discard', 'Discard what you added?'))) return;
    navigate(itemId ? playbookItemPath(map.slug, itemId) : playbookMapPath(map.slug));
  };

  if (!loaded) return <p className={css.Muted}>{tr('playbook.loading', 'Loading…')}</p>;

  const pins = from ? [{ id: 'new', kind, from, to: spot ? null : to }] : [];
  const videoBusy = files.video.sending !== undefined && !files.video.id;

  return (
    <div ref={form} className={css.Section} style={{ maxWidth: 900 }}>
      <div className={css.Toolbar}>
        <button type="button" className={css.Button} onClick={cancel}>
          <Icon size="100" src={Icons.ArrowLeft} />
          {map.name}
        </button>
        <h1 className={css.Title}>
          {itemId
            ? tr('playbook.edit_title', 'Edit')
            : tr('playbook.new_title', 'Add to {{map}}', { map: map.name })}
        </h1>
      </div>

      <label className={css.Field} htmlFor="pb-name">
        {tr('playbook.field.name', 'What it is')}
        <input
          id="pb-name"
          className={css.Input}
          value={name}
          maxLength={80}
          placeholder={tr('playbook.placeholder.name', 'Wallbang from mid to A site')}
          onChange={(e) => {
            touch();
            setName(e.target.value);
          }}
          aria-invalid={missing.length > 0 && !name.trim()}
        />
      </label>

      <div className={css.Toolbar} role="group" aria-label={tr('playbook.kind_label', 'Type')}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={css.Chip}
            aria-pressed={kind === k}
            onClick={() => {
              touch();
              setKind(k);
            }}
          >
            <span className={css.Dot} style={{ background: KIND_COLOR[k] }} />
            {kindLabel(k)}
          </button>
        ))}
      </div>
      <div className={css.Toolbar}>
        {SIDES.map((s) => (
          <button
            key={s}
            type="button"
            className={css.Chip}
            aria-pressed={side === s}
            onClick={() => {
              touch();
              setSide(s);
            }}
          >
            {s}
          </button>
        ))}
        <select
          className={css.Input}
          aria-label={tr('playbook.area', 'Area')}
          value={area}
          onChange={(e) => {
            touch();
            setArea(e.target.value);
          }}
        >
          {map.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <h2 className={css.SectionTitle}>{slotLabel('cover')}</h2>
      <p className={`${css.Muted} ${css.Small}`}>
        {tr(
          'playbook.cover_hint',
          "The setup's card on the map: a screenshot of where it is done. Paste it with Ctrl+V."
        )}
      </p>
      <DropZone
        api={api}
        slot="cover"
        type="image"
        upload={files.cover}
        tall
        onFile={(f) => send('cover', f)}
      />

      <h2 className={css.SectionTitle}>{tr('playbook.tab.video', 'Video')}</h2>
      <div className={css.Toolbar}>
        <input
          className={css.Search}
          style={{ maxWidth: 'none' }}
          value={link}
          placeholder={tr(
            'playbook.placeholder.link',
            'YouTube link (with ?t= to start at the moment)'
          )}
          aria-label={tr('playbook.link_label', 'YouTube link')}
          disabled={videoBusy}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') fetchLink();
          }}
        />
        <button
          type="button"
          className={css.Button}
          disabled={videoBusy || !link.trim()}
          onClick={fetchLink}
        >
          {tr('playbook.fetch_link', 'Use this video')}
        </button>
      </div>
      <p className={`${css.Muted} ${css.Small}`}>
        {tr(
          'playbook.link_hint',
          'The server downloads it and keeps up to 3 minutes from the link’s time, so it keeps working even if the video leaves YouTube.'
        )}
      </p>
      <DropZone
        api={api}
        slot="video"
        type="video"
        upload={files.video}
        missing={missing.length > 0 && !files.video.id}
        onFile={(f) => send('video', f)}
      />

      <details className={css.Panel}>
        <summary>{tr('playbook.optional_details', 'More details (optional)')}</summary>
        <div className={css.Fields}>
          <label className={css.Field} htmlFor="pb-technique">
            {tr('playbook.field.technique', 'Throw')}
            <select
              id="pb-technique"
              className={css.Input}
              value={technique}
              onChange={(e) => {
                touch();
                setTechnique(e.target.value as Technique | '');
              }}
            >
              <option value="">—</option>
              {TECHNIQUES.filter((t) => t !== 'other').map((t) => (
                <option key={t} value={t}>
                  {techniqueLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className={css.Field} htmlFor="pb-from">
            {tr('playbook.field.place', 'From')}
            <input
              id="pb-from"
              className={css.Input}
              value={fromLabel}
              maxLength={80}
              placeholder={tr('playbook.placeholder.place', 'T spawn')}
              onChange={(e) => {
                touch();
                setFromLabel(e.target.value);
              }}
            />
          </label>
          <label className={`${css.Field} ${css.Wide}`} htmlFor="pb-note">
            {tr('playbook.field.note', 'Note')}
            <textarea
              id="pb-note"
              className={css.Input}
              style={{ height: 70, padding: 10, resize: 'vertical' }}
              value={note}
              maxLength={1000}
              onChange={(e) => {
                touch();
                setNote(e.target.value);
              }}
            />
          </label>
        </div>
        <h2 className={css.SectionTitle}>{tr('playbook.more_shots', 'More screenshots')}</h2>
        <div className={css.Slots}>
          {(['stand', 'aim', 'result'] as const).map((s) => (
            <DropZone
              key={s}
              api={api}
              slot={s}
              type="image"
              upload={files[s]}
              onFile={(f) => send(s, f)}
            />
          ))}
        </div>
        {map.radar && (
          <>
            <h2 className={css.SectionTitle}>{tr('playbook.radar_title', 'On the map')}</h2>
            <p className={`${css.Muted} ${css.Small}`}>
              {tr(
                'playbook.place_points',
                'Click where it is done from, then where it lands. Drag to adjust.'
              )}
            </p>
            <div style={{ maxWidth: 320 }}>
              <Radar
                api={api}
                map={map}
                pins={pins}
                hot="new"
                onPlace={place}
                onDrag={(which, p) => {
                  touch();
                  if (which === 'from') setFrom(p);
                  else setTo(p);
                }}
                label={tr('playbook.radar_place', 'Map: click to place the points')}
              />
            </div>
            {from && (
              <button
                type="button"
                className={css.Button}
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  touch();
                  setFrom(null);
                  setTo(null);
                }}
              >
                {tr('playbook.clear_points', 'Clear points')}
              </button>
            )}
          </>
        )}
      </details>

      <div className={css.Toolbar}>
        <button
          type="button"
          className={`${css.Button} ${css.Primary}`}
          onClick={save}
          disabled={saving || busy}
        >
          {saving ? tr('playbook.saving', 'Saving…') : tr('playbook.save', 'Save')}
        </button>
        <button type="button" className={css.Button} onClick={cancel}>
          {tr('playbook.cancel', 'Cancel')}
        </button>
        {busy && (
          <span className={css.Muted}>
            {tr('playbook.wait_uploads', 'Wait for the uploads to finish.')}
          </span>
        )}
        {missing.length > 0 && (
          <p role="alert" className={css.Error}>
            {tr('playbook.missing', 'Missing: {{list}}.', { list: missing.join(', ') })}
          </p>
        )}
        {saveError && (
          <p role="alert" className={css.Error}>
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}
