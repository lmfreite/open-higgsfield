/** Sends a file to the project's uploads folder and returns the URL the studio
    reads it back from. The file only reaches fal when a generation uses it. */
export async function uploadMedia(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const payload = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
  if (!res.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `the server answered ${res.status}`);
  }
  if (typeof payload?.url !== "string") throw new Error("the server did not return a file URL");
  return { url: payload.url };
}

export type Deletion = { deleted: true } | { deleted: false; note: string };

/** Removes an upload from the project's uploads folder. A URL that is not one of
    this studio's own — an older Blob-hosted file — has nothing here to delete,
    and a file saved by another browser is not this one's to delete; both say so
    instead of failing, so the entry can still leave the library. */
export async function deleteUpload(url: string): Promise<Deletion> {
  if (!url.startsWith("/api/uploads/")) {
    return { deleted: false, note: "the file is hosted outside this project, so it was not deleted" };
  }
  const res = await fetch(url, { method: "DELETE" });
  if (res.status === 403) {
    return { deleted: false, note: "the file was saved by another browser session and stays in the uploads folder" };
  }
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  return { deleted: true };
}
