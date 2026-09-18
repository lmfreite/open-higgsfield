"use client";

import { useEffect, useRef, useState } from "react";

import { clearScriptKey, generateScript, hasScriptKey, saveScriptKey } from "@/generation/script-actions";

import { timeAgo } from "./history";
import { ArrowRightIcon, CaretDownIcon, CheckIcon, CopyIcon, TrashIcon, WarningIcon } from "./icons";
import { DEFAULT_BASE_URL, DEFAULT_SYSTEM, useScriptSettings, useScripts } from "./scripts-store";

/** The writing room: brief in, script out, and the model that writes it is the
    visitor's own — any OpenAI-compatible endpoint, named by its base URL. */
export function ScriptStudio({ onUse }: { onUse: (text: string) => void }) {
  const { baseUrl, model, system, set } = useScriptSettings();
  const { brief, text, library, setBrief, setText, save, open, remove } = useScripts();

  /* Open while the connection is incomplete, so a first visit lands on what
     has to be filled in — and folded once it is, so the page is about the script. */
  const [connectionOpen, setConnectionOpen] = useState(() => model.trim() === "");
  const [keyHeld, setKeyHeld] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const noteTimer = useRef<number | null>(null);

  useEffect(() => {
    void hasScriptKey().then(setKeyHeld);
    return () => {
      if (noteTimer.current !== null) clearTimeout(noteTimer.current);
    };
  }, []);

  /* A receipt that fades on its own: the press is over, and a status that
     stayed would read as a state the script is still in. */
  function say(message: string) {
    setNote(message);
    if (noteTimer.current !== null) clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 2200);
  }

  async function write() {
    if (writing) return;
    setError(null);
    if (!model.trim()) {
      setConnectionOpen(true);
      setError("Set the model first — it is named in the connection above.");
      return;
    }
    setWriting(true);
    try {
      const result = await generateScript({ baseUrl, model, system, brief });
      setText(result.text);
      outputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not write the script");
    } finally {
      setWriting(false);
    }
  }

  async function saveKey() {
    setKeyBusy(true);
    setError(null);
    try {
      await saveScriptKey({ apiKey: keyInput });
      setKeyInput("");
      setKeyHeld(true);
      say("Key saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the key");
    } finally {
      setKeyBusy(false);
    }
  }

  async function removeKey() {
    setKeyBusy(true);
    setError(null);
    try {
      await clearScriptKey();
      setKeyHeld(await hasScriptKey());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the key");
    } finally {
      setKeyBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      say("Copied");
    } catch {
      setError("The browser refused the copy — select the text and copy it by hand.");
    }
  }

  /* The selection if there is one, the whole script if not: a scene is what
     gets pasted into a shot, and the script is what a one-take video wants. */
  function use() {
    const field = outputRef.current;
    const picked = field ? field.value.slice(field.selectionStart, field.selectionEnd).trim() : "";
    onUse(picked || text.trim());
  }

  const host = hostOf(baseUrl);
  const summary = [model.trim() || "No model set", host].filter(Boolean).join(" · ");

  return (
    <div
      id="ohf-panel"
      role="tabpanel"
      aria-labelledby="ohf-tab-scripts"
      className="ohf-gallery ohf-scroll ohf-script-panel"
    >
      <div className="ohf-script">
        <section className="ohf-script-card" aria-label="Connection">
          <button
            type="button"
            className="ohf-script-head"
            aria-expanded={connectionOpen}
            onClick={() => setConnectionOpen((current) => !current)}
          >
            <span className="ohf-script-title">Connection</span>
            <span className="ohf-script-summary">{summary}</span>
            <span className="ohf-script-caret" data-open={connectionOpen}>
              <CaretDownIcon />
            </span>
          </button>

          {connectionOpen && (
            <div className="ohf-script-body">
              <label className="ohf-field">
                <div className="ohf-field-label">Base URL</div>
                <input
                  className="ohf-input ohf-input--mono"
                  value={baseUrl}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={DEFAULT_BASE_URL}
                  onChange={(event) => set({ baseUrl: event.target.value })}
                />
              </label>

              <label className="ohf-field">
                <div className="ohf-field-label">Model</div>
                <input
                  className="ohf-input ohf-input--mono"
                  value={model}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="gpt-4o-mini, claude-sonnet-5, llama3.1…"
                  onChange={(event) => set({ model: event.target.value })}
                />
              </label>

              <div className="ohf-field">
                <div className="ohf-field-row">
                  <div className="ohf-field-label">API key</div>
                  <span className="ohf-script-hint">
                    {keyHeld === null ? "" : keyHeld ? "A key is saved on this server" : "No key saved"}
                  </span>
                </div>
                <div className="ohf-script-keyrow">
                  <input
                    className="ohf-input ohf-input--mono"
                    type="password"
                    value={keyInput}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={keyHeld ? "Enter a new key to replace it" : "Optional for a local model"}
                    onChange={(event) => setKeyInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && keyInput.trim()) void saveKey();
                    }}
                  />
                  <button
                    type="button"
                    className="ohf-btn-solid"
                    disabled={keyBusy || !keyInput.trim()}
                    onClick={() => void saveKey()}
                  >
                    Save key
                  </button>
                  {keyHeld && (
                    <button
                      type="button"
                      className="ohf-btn-quiet"
                      disabled={keyBusy}
                      onClick={() => void removeKey()}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="ohf-script-hint">
                  Kept in an httpOnly cookie and sent as Authorization: Bearer. Any OpenAI-compatible
                  endpoint works — OpenAI, Anthropic&rsquo;s /v1 compatibility layer, OpenRouter, a local
                  Ollama.
                </p>
              </div>

              <div className="ohf-field">
                <div className="ohf-field-row">
                  <div className="ohf-field-label">Instructions</div>
                  {system !== DEFAULT_SYSTEM && (
                    <button
                      type="button"
                      className="ohf-btn-quiet ohf-script-reset"
                      onClick={() => set({ system: DEFAULT_SYSTEM })}
                    >
                      Reset
                    </button>
                  )}
                </div>
                <textarea
                  className="ohf-input ohf-script-area ohf-script-area--system"
                  aria-label="Instructions"
                  value={system}
                  spellCheck={false}
                  onChange={(event) => set({ system: event.target.value })}
                />
              </div>
            </div>
          )}
        </section>

        <section className="ohf-script-card" aria-label="Brief">
          <div className="ohf-script-body">
            <label className="ohf-field">
              <div className="ohf-field-label">What is the video about?</div>
              <textarea
                className="ohf-input ohf-script-area"
                rows={4}
                value={brief}
                placeholder="A lighthouse keeper finds a message in a bottle — tone, length, characters, anything that should shape the script…"
                onChange={(event) => setBrief(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void write();
                  }
                }}
              />
            </label>
            <div className="ohf-script-actions">
              <span className="ohf-script-hint">{brief.length > 0 ? `${brief.length} characters` : ""}</span>
              <button
                type="button"
                className="ohf-keys-save ohf-script-write"
                disabled={writing || brief.trim().length === 0}
                onClick={() => void write()}
              >
                {writing ? <span className="ohf-spinner" aria-hidden /> : null}
                {writing ? "Writing…" : text ? "Write again" : "Write script"}
              </button>
            </div>
            {error && (
              <div className="ohf-alert" role="alert">
                <span className="ohf-alert-ic">
                  <WarningIcon />
                </span>
                <span className="ohf-alert-text">{error}</span>
              </div>
            )}
          </div>
        </section>

        <section className="ohf-script-card" aria-label="Script">
          <div className="ohf-script-body">
            <div className="ohf-field">
              <div className="ohf-field-row">
                <div className="ohf-field-label">Script</div>
                <span className="ohf-script-hint" role="status">
                  {note}
                </span>
              </div>
              <textarea
                ref={outputRef}
                className="ohf-input ohf-script-area ohf-script-area--output"
                aria-label="Script"
                value={text}
                placeholder="The script lands here. It is yours to edit — select a scene to send just that."
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            <div className="ohf-script-actions">
              <div className="ohf-script-tools">
                <button type="button" className="ohf-btn-quiet" disabled={!text} onClick={() => void copy()}>
                  <CopyIcon /> Copy
                </button>
                <button
                  type="button"
                  className="ohf-btn-quiet"
                  disabled={!text.trim()}
                  onClick={() => {
                    if (save()) say("Saved to your scripts");
                  }}
                >
                  <CheckIcon /> Save
                </button>
                <button type="button" className="ohf-btn-quiet" disabled={!text} onClick={() => setText("")}>
                  Clear
                </button>
              </div>
              <button
                type="button"
                className="ohf-btn-solid"
                disabled={!text.trim()}
                title="Sends the selected text — or the whole script if nothing is selected — to the Video prompt"
                onClick={use}
              >
                Send to Video prompt
                <ArrowRightIcon />
              </button>
            </div>
          </div>
        </section>

        {library.length > 0 && (
          <section className="ohf-script-card" aria-label="Saved scripts">
            <div className="ohf-script-body">
              <div className="ohf-field-label">Saved scripts</div>
              <ul className="ohf-script-list">
                {library.map((record) => (
                  <li key={record.id} className="ohf-script-item">
                    <button
                      type="button"
                      className="ohf-script-open"
                      title="Open on the page"
                      onClick={() => {
                        open(record.id);
                        outputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                      }}
                    >
                      <span className="ohf-script-item-title">{record.title}</span>
                      <span className="ohf-script-hint">{timeAgo(record.createdAt)}</span>
                    </button>
                    {confirmId === record.id ? (
                      <span className="ohf-script-confirm">
                        <button type="button" className="ohf-btn-quiet" autoFocus onClick={() => setConfirmId(null)}>
                          Keep
                        </button>
                        <button
                          type="button"
                          className="ohf-btn-solid"
                          onClick={() => {
                            remove(record.id);
                            setConfirmId(null);
                          }}
                        >
                          Delete
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="ohf-icon-btn ohf-viewer-trash"
                        aria-label={`Delete script — ${record.title}`}
                        title="Delete script"
                        onClick={() => setConfirmId(record.id)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl.trim()).host;
  } catch {
    return "";
  }
}
