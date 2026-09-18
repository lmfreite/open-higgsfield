"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { MediaItem, MediaRole, ModelEntry } from "@/generation/catalog";
import { useImageMedia, useVideoMedia } from "@/generation/stores/media";
import { uploadMedia } from "@/generation/upload";

import { ROLE_ACCEPT, ROLE_KINDS, ROLE_LABELS, ROLE_TAGS, rolesOf, type AssetKind } from "./data";
import { AudioIcon, CloseIcon, VideoIcon } from "./icons";
import { kindOfFile, type UploadRecord } from "./uploads";
import { useUploads } from "./uploads-store";

function useMedia(model: ModelEntry) {
  const imageMedia = useImageMedia();
  const videoMedia = useVideoMedia();
  return model.surface === "image" ? imageMedia : videoMedia;
}

export interface MediaTray {
  roles: MediaRole[];
  /** The current surface's attachments, so the picker can derive its own caps
      from the same list the strip below renders. */
  items: MediaItem[];
  /** Every file this browser has saved to the uploads folder, newest first. */
  uploads: UploadRecord[];
  /** The last file uploaded from the picker. It goes onto the shelf and into the
      panel's selection, not onto the plane — the panel stages the whole set and
      one press applies it. The nonce is what tells a file saved again from one
      that was already there: the same URL twice is still a new arrival. */
  staged: { url: string; nonce: number } | null;
  uploading: boolean;
  allFull: boolean;
  /** Save files and attach each to the first free slot that takes its kind —
      what a paste does when nothing is open to receive it. */
  paste: (files: File[]) => Promise<void>;
  /** Save files and hand them to the open picker, which selects them for the
      role it is showing. */
  stage: (files: File[]) => Promise<void>;
  /** Hidden file input; render it once inside the composer. */
  input: ReactNode;
  /** Set the role the next file takes, then open the OS picker. */
  begin: (role: MediaRole) => void;
  /** Make the role's inputs exactly these URLs — the picker hands back the set
      it edited, so one press both attaches and detaches. */
  apply: (role: MediaRole, urls: string[]) => void;
}

export type Slot = { role: MediaRole } | { error: string };

/** Where a file of this kind goes on the plane: the first slot it fits, in the
    order the model declares them — a model that lists start, intermediate, end
    fills in time order, so a run of pasted frames lands where the picker's own
    "advance" would take them. Or why it cannot. */
export function slotFor(model: ModelEntry, items: MediaItem[], kind: AssetKind): Slot {
  const fits = rolesOf(model).filter(
    (role) => ROLE_KINDS[role] === kind && (model.roles[role] ?? 0) > 0,
  );
  if (fits.length === 0) return { error: `${model.label} does not take ${kind} inputs.` };
  const open = fits.find(
    (role) => items.filter((item) => item.role === role).length < model.roles[role]!,
  );
  return open
    ? { role: open }
    : { error: `Every ${kind} slot on ${model.label} is taken — remove one first.` };
}

export function useMediaTray(
  model: ModelEntry,
  onError: (message: string | null) => void,
  onNotice: (message: string) => void,
): MediaTray {
  const media = useMedia(model);
  /* A count, not a flag: a paste of several files saves them one after another,
     and the spinner should hold across the gaps between them. */
  const [pending, setPending] = useState(0);
  const uploading = pending > 0;
  const uploads = useUploads((state) => state.records);
  const rememberUpload = useUploads((state) => state.add);
  const [staged, setStaged] = useState<{ url: string; nonce: number } | null>(null);
  const roleRef = useRef<MediaRole>("reference");
  const inputRef = useRef<HTMLInputElement>(null);

  /* The shelf is shared with the Assets grid, which can delete from it: it is
     read once here, and written back by the store on every change. */
  useEffect(() => {
    void useUploads.getState().hydrate();
  }, []);

  const roles = rolesOf(model);
  const counts: Record<string, number> = {};
  for (const role of roles) {
    counts[role] = media.items.filter((item) => item.role === role).length;
  }
  const allFull = roles.length > 0 && roles.every((role) => counts[role]! >= (model.roles[role] ?? 0));

  /* Saves one file to the uploads folder and puts it on the shelf. Resolves to
     its URL, or null when it failed — the error is already on screen. A file the
     folder already holds comes back as that copy, and the visitor is told. */
  async function save(file: File): Promise<string | null> {
    onError(null);
    setPending((count) => count + 1);
    try {
      const uploaded = await uploadMedia(file);
      if (uploaded.reused) onNotice("Already in your uploads — reusing that copy, nothing new was saved");
      /* The file outlives this run: it joins the shelf the picker offers, so a
         reference used once can be reached again without a second upload. */
      setStaged((prev) => ({ url: uploaded.url, nonce: (prev?.nonce ?? 0) + 1 }));
      rememberUpload({
        id: crypto.randomUUID(),
        url: uploaded.url,
        kind: kindOfFile(file),
        name: file.name,
        createdAt: Date.now(),
      });
      return uploaded.url;
    } catch (caught) {
      onError(
        caught instanceof Error
          ? `Upload failed — ${caught.message}. Retry, or generate from the prompt alone.`
          : "Upload failed. Retry, or drop the file and generate from the prompt alone.",
      );
      return null;
    } finally {
      setPending((count) => count - 1);
    }
  }

  const store = model.surface === "image" ? useImageMedia : useVideoMedia;

  function freeRole(file: File): MediaRole | null {
    const slot = slotFor(model, store.getState().items, kindOfFile(file));
    if ("error" in slot) {
      onError(slot.error);
      return null;
    }
    return slot.role;
  }

  async function paste(files: File[]) {
    for (const file of files) {
      if (!freeRole(file)) continue;
      const url = await save(file);
      if (!url) continue;
      /* The same file twice on one plane is nearly always a slip, and a reused
         copy makes it easy to make: it is left where it is. */
      if (store.getState().items.some((item) => item.url === url)) {
        onNotice("That file is already attached");
        continue;
      }
      /* Asked again once the file is saved: the slot it was promised may have
         been taken while it travelled. */
      const role = freeRole(file);
      if (role) store.getState().add({ id: crypto.randomUUID(), url, role });
    }
  }

  async function stage(files: File[]) {
    for (const file of files) await save(file);
  }

  async function onFile(file: File | undefined) {
    if (file) await save(file);
  }

  /* accept is set on the element rather than through state: the picker opens in
     the same tick as the choice, before React could re-render it. */
  function begin(role: MediaRole) {
    const element = inputRef.current;
    if (!element) return;
    roleRef.current = role;
    element.accept = ROLE_ACCEPT[role];
    element.click();
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void onFile(file);
      }}
    />
  );

  /* A replace, not an append: the panel edits one role's whole set, so what it
     hands back decides both what arrives and what leaves. Rows whose URL
     survives keep their id, and with it their place in the strip. */
  function apply(role: MediaRole, urls: string[]) {
    const keep = new Set(urls);
    const held = new Set<string>();
    for (const item of media.items) {
      if (item.role !== role) continue;
      if (keep.has(item.url)) held.add(item.url);
      else media.remove(item.id);
    }
    for (const url of urls) {
      if (!held.has(url)) media.add({ id: crypto.randomUUID(), url, role });
    }
  }

  return {
    roles,
    items: media.items,
    uploads,
    staged,
    uploading,
    allFull,
    paste,
    stage,
    input,
    begin,
    apply,
  };
}

/** Attached inputs, above the prompt — the frames read before the words do. */
export function MediaStrip({ model }: { model: ModelEntry }) {
  const media = useMedia(model);
  const items = media.items.filter((item) => model.roles[item.role]);
  if (items.length === 0) return null;

  return (
    <ul className="ohf-strip">
      {items.map((item) => (
        <li key={item.id} className="ohf-strip-item">
          <span className="ohf-strip-tile">
            {item.role === "audio" || item.role === "video" ? (
              <span className="ohf-strip-glyph">
                {item.role === "audio" ? <AudioIcon size={20} /> : <VideoIcon size={20} />}
              </span>
            ) : (
              /* Locally saved user upload; next/image would proxy an arbitrary
                 remote host for a 56px thumb. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="ohf-strip-thumb"
                src={item.url}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            )}
            <span className="ohf-strip-tag">{ROLE_TAGS[item.role]}</span>
          </span>
          <button
            type="button"
            className="ohf-strip-remove"
            aria-label={`Remove ${ROLE_LABELS[item.role].toLowerCase()}`}
            onClick={() => media.remove(item.id)}
          >
            <CloseIcon size={10} />
          </button>
        </li>
      ))}
    </ul>
  );
}
