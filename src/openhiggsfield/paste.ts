/** What the uploads folder accepts, and what each type is called on disk. A
    pasted blob often arrives nameless — or as the browser's generic "image.png"
    — so the extension is rebuilt from its type. */
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/* Some systems hand over a file with no type at all; its name still says. */
const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  wav: "audio/wav",
};

/** The files a paste is carrying, ready to upload — or none, so the paste goes
    on to be the text it would have been.

    A screenshot or "Copy image" carries the picture alone. Copying a file in the
    Finder or Explorer carries the file and its name as text. Copying cells or a
    page selection carries real text next to an image of it, and that one is the
    visitor pasting words: only the first two are taken. */
export function pastedFiles(clipboard: DataTransfer | null): File[] {
  if (!clipboard) return [];
  const files = Array.from(clipboard.files);
  if (files.length === 0) return [];

  const text = clipboard.getData("text/plain").trim();
  if (text && !files.some((file) => file.name === text)) return [];

  return files.flatMap((file) => {
    const typed = file.type || TYPES_BY_EXTENSION[extensionOf(file.name)] || "";
    const ext = EXTENSIONS[typed];
    if (!ext) return [];
    const generic = /^image\.\w+$/i.test(file.name);
    const name = generic || !extensionOf(file.name) ? `pasted-${Date.now()}.${ext}` : file.name;
    return [new File([file], name, { type: typed })];
  });
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}
