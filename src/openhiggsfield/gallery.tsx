"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import type { Surface } from "@/generation/catalog";

import { swatchFor } from "./artwork";
import { CROSS_VIEWS, SAMPLES, pickSamples, type GalleryView } from "./data";
import type { UploadRecord } from "./uploads";
import type { ActiveRun } from "./openhiggsfield-app";
import {
  ArrowRightIcon,
  AudioIcon,
  CheckIcon,
  DownloadIcon,
  HeartIcon,
  PlayBadgeIcon,
  PlusIcon,
  RetryIcon,
  TrashIcon,
  WarningIcon,
} from "./icons";
import { timeAgo, type RunRecord } from "./history";
import { ModelIcon } from "./model-icon";

const EMPTY: Record<GalleryView, { title: string; hint: string }> = {
  image: {
    title: "Your image runs land here",
    hint: "Describe a subject below, pick a model, press Generate. Every finished run stays in this browser.",
  },
  video: {
    title: "Your video runs land here",
    hint: "Describe the shot below, pick a model, press Generate. Every finished run stays in this browser.",
  },
  assets: {
    title: "Nothing here yet",
    hint: "Files you upload or paste, and every image and video run, land in this grid and stay in this browser.",
  },
  /* The writing room never shows this grid; the entry keeps the record whole. */
  scripts: {
    title: "Write a script first",
    hint: "Scripts have their own room — open it from the scope bar.",
  },
  favorites: {
    title: "Nothing kept yet",
    hint: "Hover a run and press its heart to keep it here. Kept runs stay put when older ones age out of the history.",
  },
};

/* Action labels name the run they act on — tabbing a long grid otherwise
   reads as forty identical "Delete run"s. */
function shortPrompt(prompt: string): string {
  return prompt.length > 48 ? `${prompt.slice(0, 47)}…` : prompt;
}

const GRID_GAP = 14;
const COLUMNS = 4;
/** Every tile is the same 4:3 slot; media is contained so it keeps its own ratio. */
const CARD_RATIO = 4 / 3;

type Slot =
  | { key: string; kind: "run"; run: ActiveRun }
  | { key: string; kind: "upload"; upload: UploadRecord }
  | { key: string; kind: "item"; item: RunRecord; index: number };

/* Rendering runs lead, then the files the visitor brought, then what came back.
   Uploads sit ahead of the results because they are the few things in this grid
   that can be deleted from disk — and there are far fewer of them. */
function slotsOf(runs: ActiveRun[], uploads: UploadRecord[], items: RunRecord[]): Slot[] {
  const slots: Slot[] = runs.map((run) => ({ key: run.id, kind: "run", run }));
  for (const upload of uploads) slots.push({ key: `upload-${upload.id}`, kind: "upload", upload });
  items.forEach((item, index) => {
    if (item.status === "running") {
      slots.push({
        key: item.id,
        kind: "run",
        run: {
          id: item.id,
          surface: item.surface,
          modelLabel: item.modelLabel,
          ratio: item.ratio,
          startedAt: item.createdAt,
        },
      });
      return;
    }
    slots.push({ key: item.id, kind: "item", item, index });
  });
  return slots;
}

function useInnerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const styles = getComputedStyle(node);
      const pad = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setWidth(Math.max(0, node.clientWidth - pad));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const Tile = memo(function Tile({
  item,
  index,
  fresh,
  picked,
  selecting,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
}: {
  item: RunRecord;
  index: number;
  fresh: boolean;
  picked: boolean;
  /* Once anything is picked the grid is in selection mode: every checkbox
     stands, and the card body toggles rather than opens. */
  selecting: boolean;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
}) {
  const delay = `${Math.min(index * 0.035, 0.28).toFixed(3)}s`;
  const poster = item.urls[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  /* The keep beat is driven from the click, never from mount: a CSS animation
     bound to the saved state alone would re-fire on every scope switch. */
  const [beat, setBeat] = useState(false);
  /* A video is megabytes read over the wire before the browser is handed
     anything, so the press has to say it landed. */
  const [saving, setSaving] = useState(false);
  const saved = item.favorite === true;
  const named = shortPrompt(item.prompt);
  const facts = item.meta ? item.meta.split(" · ") : [];

  /* Top-left, where a selection mark is looked for, and the one control on the
     card that is not about this run alone. It carries the whole checkbox
     semantics rather than a pressed button: a grid of these is a multi-select,
     and a screen reader should hear it as one. */
  const picker = (
    <button
      type="button"
      className="ohf-pick"
      role="checkbox"
      aria-checked={picked}
      aria-label={`Select run — ${named}`}
      title={picked ? "Deselect" : "Select"}
      onClick={(event) => onPick(item.id, index, event.shiftKey)}
    >
      <span className="ohf-pick-box">
        <CheckIcon size={12} />
      </span>
    </button>
  );

  const remove = (
    <button
      type="button"
      className="ohf-tile-act ohf-tile-act--danger"
      aria-label={`Delete run — ${named}`}
      title="Delete run"
      onClick={() => onDelete(item)}
    >
      <TrashIcon size={15} />
    </button>
  );

  if (item.status === "failed") {
    return (
      <div
        className="ohf-tile ohf-tile--failed"
        data-picked={picked}
      >
        <div className="ohf-fail">
          <span className="ohf-fail-ic">
            <WarningIcon />
          </span>
          <span className="ohf-fail-title">{item.modelLabel} didn’t deliver</span>
          <span className="ohf-fail-why">{item.error}</span>
          <button
            type="button"
            className="ohf-btn-solid"
            title="Reuse prompt and settings"
            onClick={() => onReuse(item)}
          >
            <RetryIcon />
            Retry this run
          </button>
        </div>
        {picker}
        <div className="ohf-tile-acts">{remove}</div>
      </div>
    );
  }

  return (
    /* A container, not a button: the card's own actions cannot nest inside the
       control that opens it. The stretched .ohf-tile-open carries the open. */
    <div
      className="ohf-tile"
      data-fresh={fresh}
      data-picked={picked}
      data-saving={saving || undefined}
      style={{ "--d": delay } as CSSProperties}
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      }}
    >
      {poster &&
        (item.kind === "video" ? (
          <video
            ref={videoRef}
            className="ohf-tile-media"
            src={poster}
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          /* Platform-hosted result on an arbitrary CDN host; next/image would
             need every provider domain allow-listed up front. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="ohf-tile-media" src={poster} alt={item.prompt} loading="lazy" />
        ))}

      {/* While runs are picked the card is part of a selection, so its body
          extends the selection instead of leaving the grid for the viewer —
          the same bargain every OS file grid makes. */}
      <button
        type="button"
        className="ohf-tile-open"
        onClick={(event) =>
          selecting ? onPick(item.id, index, event.shiftKey) : onOpen(item.id)
        }
        aria-label={
          selecting
            ? `${picked ? "Deselect" : "Select"} run — ${named}`
            : `Open run — ${item.modelLabel}: ${item.prompt}`
        }
      />

      {picker}

      {item.kind === "video" && item.badge && (
        <span className="ohf-tile-badge">
          <PlayBadgeIcon />
          {item.badge}
        </span>
      )}
      {/* The run signs itself only while the card is under the cursor, the same
          bargain the action rail makes — an un-hovered grid is nothing but the
          work. What distinguishes two cards of the same model is the words that
          made them, so the prompt leads; the model joins the stored one-liner's
          facts below, on the plate the rest of the card's chrome uses. */}
      <span className="ohf-tile-caption">
        <span className="ohf-tile-prompt">{item.prompt}</span>
        <span className="ohf-tile-facts">
          <span className="ohf-tile-fact ohf-tile-fact--model">
            <ModelIcon modelId={item.modelId} size={12} />
            {item.modelLabel}
          </span>
          {facts.map((fact) => (
            <span className="ohf-tile-fact" key={fact}>
              {fact}
            </span>
          ))}
        </span>
      </span>

      {/* Keep sits last, hard against the corner: it is the one action that
          shows on an un-hovered card, and the transient three open to its left
          rather than leaving it stranded mid-edge. Delete leads from the far
          end, the slot furthest from the corner the cursor arrives at. */}
      <div className="ohf-tile-acts">
        {remove}
        <button
          type="button"
          className="ohf-tile-act"
          aria-label={`Reuse prompt and settings — ${named}`}
          title="Reuse prompt and settings"
          onClick={() => onReuse(item)}
        >
          <RetryIcon size={15} />
        </button>
        {/* Absent on a run the platform returned no file for — there would be
            nothing to save. The press is guarded rather than disabled: a
            disabled button drops the focus that is holding this rail open. */}
        {poster && (
          <button
            type="button"
            className="ohf-tile-act"
            aria-label={saving ? `Saving — ${named}` : `Download run — ${named}`}
            title={saving ? "Saving" : "Download"}
            onClick={() => {
              if (saving) return;
              setSaving(true);
              void onDownload(item).finally(() => setSaving(false));
            }}
          >
            {saving ? <span className="ohf-spinner" aria-hidden /> : <DownloadIcon size={15} />}
          </button>
        )}
        <button
          type="button"
          className="ohf-tile-act"
          data-on={saved}
          data-beat={beat || undefined}
          aria-pressed={saved}
          aria-label={`${saved ? "Remove from favorites" : "Save to favorites"} — ${named}`}
          title={saved ? "Remove from favorites" : "Save to favorites"}
          onClick={() => {
            if (!saved) setBeat(true);
            onFavorite(item);
          }}
          onAnimationEnd={() => setBeat(false)}
        >
          <HeartIcon size={16} filled={saved} />
        </button>
      </div>
    </div>
  );
});

export const Gallery = memo(function Gallery({
  view,
  surface,
  items,
  runs,
  uploads,
  freshIds,
  picked,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
  onDeleteUpload,
  onUseUpload,
  onStarter,
  galleryRef,
}: {
  view: GalleryView;
  surface: Surface;
  items: RunRecord[];
  runs: ActiveRun[];
  /** Files the visitor saved; only the Assets scope shows them. */
  uploads: UploadRecord[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
  onDeleteUpload: (upload: UploadRecord) => Promise<void>;
  onUseUpload: (upload: UploadRecord) => void;
  onStarter: (prompt: string) => void;
  galleryRef: RefObject<HTMLDivElement | null>;
}) {
  const selecting = picked.size > 0;
  const panel = {
    id: "ohf-panel",
    role: "tabpanel",
    "aria-labelledby": `ohf-tab-${view}`,
    className: "ohf-gallery ohf-scroll",
  } as const;

  if (items.length === 0 && runs.length === 0 && uploads.length === 0) {
    return (
      <div {...panel} ref={galleryRef}>
        <Empty view={view} surface={surface} onStarter={onStarter} key={view} />
      </div>
    );
  }

  return (
    <div {...panel} ref={galleryRef}>
      <VirtualizedGrid
        key={view}
        scrollRef={galleryRef}
        selecting={selecting}
        runs={runs}
        uploads={uploads}
        items={items}
        freshIds={freshIds}
        picked={picked}
        onOpen={onOpen}
        onPick={onPick}
        onReuse={onReuse}
        onFavorite={onFavorite}
        onDownload={onDownload}
        onDelete={onDelete}
        onDeleteUpload={onDeleteUpload}
        onUseUpload={onUseUpload}
      />
    </div>
  );
});

function VirtualizedGrid({
  scrollRef,
  selecting,
  runs,
  uploads,
  items,
  freshIds,
  picked,
  onOpen,
  onPick,
  onReuse,
  onFavorite,
  onDownload,
  onDelete,
  onDeleteUpload,
  onUseUpload,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  selecting: boolean;
  runs: ActiveRun[];
  uploads: UploadRecord[];
  items: RunRecord[];
  freshIds: string[];
  picked: ReadonlySet<string>;
  onOpen: (id: string) => void;
  onPick: (id: string, index: number, range: boolean) => void;
  onReuse: (item: RunRecord) => void;
  onFavorite: (item: RunRecord) => void;
  onDownload: (item: RunRecord) => Promise<void>;
  onDelete: (item: RunRecord) => void;
  onDeleteUpload: (upload: UploadRecord) => Promise<void>;
  onUseUpload: (upload: UploadRecord) => void;
}) {
  const width = useInnerWidth(scrollRef);
  const slots = useMemo(() => slotsOf(runs, uploads, items), [runs, uploads, items]);
  const rows = Math.max(1, Math.ceil(slots.length / COLUMNS));

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize: (row) => {
      if (width <= 0) return 240;
      const col = (width - GRID_GAP * (COLUMNS - 1)) / COLUMNS;
      return col / CARD_RATIO + (row === rows - 1 ? 0 : GRID_GAP);
    },
    overscan: 4,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [width, slots, virtualizer]);

  return (
    <div className="ohf-grid-window" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((row) => {
        const from = row.index * COLUMNS;
        const slice = slots.slice(from, from + COLUMNS);
        return (
          <div
            key={row.key}
            className="ohf-grid"
            data-selecting={selecting}
            style={
              {
                "--ohf-cols": COLUMNS,
                transform: `translateY(${row.start}px)`,
              } as CSSProperties
            }
          >
            {slice.map((slot) =>
              slot.kind === "run" ? (
                <RunningTile key={slot.key} run={slot.run} />
              ) : slot.kind === "upload" ? (
                <UploadTile
                  key={slot.key}
                  upload={slot.upload}
                  onUse={onUseUpload}
                  onDelete={onDeleteUpload}
                />
              ) : (
                <Tile
                  key={slot.key}
                  item={slot.item}
                  index={slot.index}
                  fresh={freshIds.includes(slot.item.id)}
                  picked={picked.has(slot.item.id)}
                  selecting={selecting}
                  onOpen={onOpen}
                  onPick={onPick}
                  onReuse={onReuse}
                  onFavorite={onFavorite}
                  onDownload={onDownload}
                  onDelete={onDelete}
                />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

/* First run of the session. No placeholder scenery — the invitation carries
   itself, and the three starters are the only thing on the ground because they
   are the only thing here that is real: sample prompts, each showing the light
   its seed would make. One click loads the
   composer; pressing Generate stays the visitor’s call. Only the surface
   scopes offer them: a starter writes one surface’s prompt, and Assets and
   Favorites span both and are stocked from the other scopes, so they state the
   gesture instead. */
function Empty({
  view,
  surface,
  onStarter,
}: {
  view: GalleryView;
  surface: Surface;
  onStarter: (prompt: string) => void;
}) {
  const thumbRatio = surface === "image" ? "4 / 3" : "16 / 9";
  /* Reshuffled on every page load, and only after mount — picking during
     render would hand the hydrating client a different three than the server
     wrote. Until the picks land the server's three hold their space unseen, so
     the invitation never jumps up the panel to make room for them. */
  const [samples, setSamples] = useState<string[] | null>(null);
  useEffect(() => setSamples(pickSamples(surface)), [surface]);

  return (
    <div className="ohf-empty">
      <div className="ohf-empty-copy">
        <h2 className="ohf-empty-title">{EMPTY[view].title}</h2>
        <p className="ohf-empty-hint">{EMPTY[view].hint}</p>

        {!CROSS_VIEWS.has(view) && (
          <ul
            className="ohf-empty-starters"
            style={samples ? undefined : { visibility: "hidden" }}
          >
            {(samples ?? SAMPLES[surface].slice(0, 3)).map((sample) => (
              <li key={sample}>
                <button type="button" className="ohf-starter" onClick={() => onStarter(sample)}>
                  <span
                    className="ohf-starter-thumb"
                    style={{ background: swatchFor(surface, sample), aspectRatio: thumbRatio }}
                  >
                    <span className="ohf-grain" style={{ opacity: 0.24 }} />
                  </span>
                  <span className="ohf-starter-text">{sample}</span>
                  <span className="ohf-starter-go">
                    <ArrowRightIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* A file the visitor brought, as opposed to one a model made. Its only action is
   the one the rest of the grid cannot offer: taking the file out of the uploads
   folder. That cannot be undone, so the press asks first — on the card, where
   the file is, instead of in a dialog that no longer shows it. */
const UploadTile = memo(function UploadTile({
  upload,
  onUse,
  onDelete,
}: {
  upload: UploadRecord;
  onUse: (upload: UploadRecord) => void;
  onDelete: (upload: UploadRecord) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div
      className="ohf-tile ohf-tile--upload"
      onMouseEnter={() => void videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        video.currentTime = 0;
      }}
    >
      {upload.kind === "video" && (
        <video
          ref={videoRef}
          className="ohf-tile-media"
          src={upload.url}
          muted
          loop
          playsInline
          preload="metadata"
        />
      )}
      {upload.kind === "image" && (
        /* A file saved by this studio; next/image would proxy it for nothing. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          className="ohf-tile-media"
          src={upload.url}
          alt={upload.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      )}
      {upload.kind === "audio" && (
        <span className="ohf-tile-glyph">
          <AudioIcon size={28} />
        </span>
      )}

      <span className="ohf-tile-badge">Upload</span>

      <span className="ohf-tile-caption">
        <span className="ohf-tile-prompt">{upload.name}</span>
        <span className="ohf-tile-facts">
          <span className="ohf-tile-fact">{upload.kind}</span>
          <span className="ohf-tile-fact">{timeAgo(upload.createdAt)}</span>
        </span>
      </span>

      <div className="ohf-tile-acts">
        <button
          type="button"
          className="ohf-tile-act ohf-tile-act--danger"
          aria-label={`Delete file — ${upload.name}`}
          title="Delete file"
          onClick={() => setConfirming(true)}
        >
          <TrashIcon size={15} />
        </button>
        {/* Reuse, not re-upload: the file is already here, so it goes onto the
            plane as it is. */}
        <button
          type="button"
          className="ohf-tile-act"
          aria-label={`Use as input — ${upload.name}`}
          title="Use as input"
          onClick={() => onUse(upload)}
        >
          <PlusIcon size={15} />
        </button>
      </div>

      {confirming && (
        <div className="ohf-tile-confirm" role="alertdialog" aria-label={`Delete ${upload.name}`}>
          <span className="ohf-tile-confirm-title">Delete this file?</span>
          <span className="ohf-tile-confirm-why">
            It leaves the uploads folder for good and comes off any input it is attached to.
          </span>
          <div className="ohf-tile-confirm-acts">
            <button
              type="button"
              className="ohf-btn-quiet"
              disabled={busy}
              autoFocus
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ohf-btn-solid"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void onDelete(upload).finally(() => {
                  setBusy(false);
                  setConfirming(false);
                });
              }}
            >
              {busy ? <span className="ohf-spinner" aria-hidden /> : <TrashIcon size={13} />}
              Delete file
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

function RunningTile({ run }: { run: ActiveRun }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - run.startedAt) / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  return (
    <div
      className="ohf-skeleton"
      role="status"
      aria-label={`${run.modelLabel} rendering`}
    >
      <span className="ohf-skeleton-label">Rendering</span>
      <span className="ohf-skeleton-clock">
        {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
      </span>
    </div>
  );
}

export function runSubtitle(item: RunRecord): string {
  return timeAgo(item.createdAt);
}
