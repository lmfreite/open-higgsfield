import { create } from "zustand";

import { loadUploads, mergeUploads, rememberUpload, saveUploads, type UploadRecord } from "./uploads";

type UploadsState = {
  /** Newest first. Shared by the composer's picker and the Assets grid, so a
      file saved in one is on the other's shelf, and one deleted from Assets is
      gone from the picker in the same breath. */
  records: UploadRecord[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  add: (record: UploadRecord) => void;
  forget: (id: string) => void;
};

let hydrating: Promise<void> | null = null;

export const useUploads = create<UploadsState>()((set, get) => {
  /* Written back on every change once the read has landed — writing before it
     has would persist the empty initial list over the stored shelf. */
  const persist = () => {
    if (get().loaded) void saveUploads(get().records);
  };

  return {
    records: [],
    loaded: false,
    hydrate: () => {
      if (get().loaded) return Promise.resolve();
      hydrating ??= loadUploads()
        .then((rows) => set((state) => ({ records: mergeUploads(rows, state.records) })))
        .catch(() => {})
        .finally(() => {
          set({ loaded: true });
          persist();
          hydrating = null;
        });
      return hydrating;
    },
    add: (record) => {
      set((state) => {
        /* The same file saved again is the entry it already was — its id and the
           name it was first given — moved to the front, not a second one. */
        const prior = state.records.find((entry) => entry.url === record.url);
        const next = prior ? { ...record, id: prior.id, name: prior.name } : record;
        return { records: rememberUpload(state.records, next) };
      });
      persist();
    },
    forget: (id) => {
      set((state) => ({ records: state.records.filter((record) => record.id !== id) }));
      persist();
    },
  };
});
