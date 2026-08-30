'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { createPlayBrowserStorage, PLAY_STORAGE_KEY } from '@/lib/universe-play/browser-storage';
import type { PlayResult, PlayView } from '@/lib/universe-play/play-types';
import './universe-play.css';

const DEBUG =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_GAME_DEBUG === '1';

async function postPlay(save: unknown, action: unknown): Promise<PlayResult> {
  const response = await fetch('/api/universe/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ save, action }),
  });
  const data = (await response.json()) as PlayResult & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'The portal could not answer.');
  }
  return data;
}

function Avatar({ variant, label }: { variant: string | null; label: string }): ReactElement {
  return (
    <div
      className={`up-avatar up-avatar--${variant ?? 'ring'}`}
      role="img"
      aria-label={`${label} avatar, ${variant ?? 'ring'} shape`}
    />
  );
}

export function PlayClient(): ReactElement {
  const storage = useMemo(
    () => createPlayBrowserStorage(typeof window === 'undefined' ? null : window.localStorage),
    [],
  );
  const [save, setSave] = useState<unknown>(null);
  const [view, setView] = useState<PlayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null);
  const [closingIndex, setClosingIndex] = useState(0);
  const [alias, setAlias] = useState('Explorer NovaBlue');
  const [palette, setPalette] = useState('gold-navy');
  const [avatar, setAvatar] = useState('ring');

  const applyResult = useCallback(
    (result: PlayResult) => {
      setSave(result.save);
      setView(result.view);
      storage.save(result.save);
    },
    [storage],
  );

  const run = useCallback(
    async (action: unknown) => {
      setBusy(true);
      setError(null);
      try {
        applyResult(await postPlay(save, action));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Something went quiet.');
      } finally {
        setBusy(false);
      }
    },
    [applyResult, save],
  );

  useEffect(() => {
    const stored = storage.load();
    void postPlay(stored, { type: 'hydrate' })
      .then(applyResult)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Could not restore.');
      });
  }, [applyResult, storage]);

  useEffect(() => {
    setSelectedFrom(null);
    setClosingIndex(0);
  }, [view?.screen]);

  if (!view) {
    return (
      <div className="up-root">
        <div className="up-shell">
          <p className="up-kicker">Opsly Universe</p>
          <p className="up-copy">The map is gathering light…</p>
        </div>
      </div>
    );
  }

  const onCreate = (event: FormEvent): void => {
    event.preventDefault();
    void run({
      type: 'create-explorer',
      explorer: { displayName: alias, palette, avatarVariant: avatar },
    });
  };

  const onConnect = (to: string): void => {
    if (!selectedFrom) {
      setSelectedFrom(to);
      return;
    }
    if (selectedFrom === to) {
      setSelectedFrom(null);
      return;
    }
    const from = selectedFrom;
    setSelectedFrom(null);
    void run({ type: 'connect', from, to });
  };

  const mapOwned = view.inventory.some((item) => item.family === 'map-fragment');
  const closing = view.closingLines[Math.min(closingIndex, view.closingLines.length - 1)];

  return (
    <div className="up-root" data-palette={view.palette ?? palette}>
      <div className="up-shell">
        <p className="up-kicker">Opsly Universe</p>
        {error ? (
          <p className="up-live" role="alert">
            {error}
          </p>
        ) : null}

        {view.screen === 'title' ? (
          <section className="up-stage" aria-labelledby="up-title">
            <h1 id="up-title" className="up-title">
              {view.title}
            </h1>
            <p className="up-sub">{view.subtitle}</p>
            <button className="up-btn" type="button" disabled={busy} onClick={() => void run({ type: 'begin' })}>
              Begin
            </button>
          </section>
        ) : null}

        {view.screen === 'explorer' ? (
          <form className="up-stage" onSubmit={onCreate} aria-labelledby="up-explorer">
            <h1 id="up-explorer" className="up-title">
              Choose an explorer
            </h1>
            <p className="up-copy">A nickname only. No real name. No school. Just a signal in the dark.</p>
            <label className="up-field">
              <span>Alias</span>
              <input
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                autoComplete="off"
                maxLength={32}
                required
                aria-describedby="up-alias-help"
              />
            </label>
            <p id="up-alias-help" className="up-copy">
              Example: Explorer NovaBlue
            </p>
            <label className="up-field">
              <span>Primary color</span>
              <select value={palette} onChange={(event) => setPalette(event.target.value)}>
                {view.explorerOptions.palettes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="up-field">
              <legend>Avatar shape</legend>
              <div className="up-row">
                {view.explorerOptions.avatars.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="up-card"
                    data-selected={avatar === option}
                    aria-pressed={avatar === option}
                    onClick={() => setAvatar(option)}
                  >
                    <Avatar variant={option} label={option} />
                    <strong>{option}</strong>
                  </button>
                ))}
              </div>
            </fieldset>
            <button className="up-btn" type="submit" disabled={busy}>
              Wake in {view.worldName}
            </button>
          </form>
        ) : null}

        {view.screen === 'nexus' ? (
          <section className="up-stage" aria-labelledby="up-nexus">
            <h1 id="up-nexus" className="up-title">
              {view.worldName}
            </h1>
            <p className="up-copy">{view.worldDescription}</p>
            <div className="up-beings">
              <article className="up-card" tabIndex={0}>
                <Avatar variant={view.avatarVariant} label={view.explorerName ?? 'Explorer'} />
                <h2>{view.explorerName}</h2>
                <p>You.</p>
              </article>
              <article className="up-card" tabIndex={0}>
                <h2>{view.nova.name}</h2>
                <p>{view.nova.tone}</p>
              </article>
              <article className="up-card" tabIndex={0}>
                <h2>{view.traveler.name}</h2>
                <p>{view.traveler.tone}</p>
              </article>
              <article className="up-card" tabIndex={0} aria-label="The Map">
                <h2>The Map</h2>
                <p>{mapOwned ? 'A new outline is waking.' : 'Still being drawn.'}</p>
              </article>
            </div>
            {mapOwned ? (
              <div className="up-closing" aria-live="polite">
                <p>
                  {view.nova.name}: {closing}
                </p>
                {closingIndex < view.closingLines.length - 1 ? (
                  <button
                    className="up-btn up-btn-ghost"
                    type="button"
                    onClick={() => setClosingIndex((index) => index + 1)}
                  >
                    …
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                className="up-btn"
                type="button"
                disabled={busy}
                onClick={() => void run({ type: 'advance-dialogue' })}
              >
                Listen
              </button>
            )}
            <div className="up-portals">
              {view.portals.map((portal) => {
                const locked = portal.status !== 'available';
                return (
                  <button
                    key={portal.id}
                    type="button"
                    className="up-card"
                    data-status={portal.status}
                    aria-disabled={locked}
                    disabled={locked || busy}
                    onClick={() => {
                      if (!locked) {
                        void run({ type: 'enter-first-portal' });
                      }
                    }}
                  >
                    <strong>{portal.name}</strong>
                    <p>{locked ? `${portal.status === 'glowing' ? 'Glowing, still locked' : 'Locked'}` : 'Available'}</p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {view.screen === 'dialogue' && view.dialogue ? (
          <section className="up-stage" aria-labelledby="up-dialogue">
            <h1 id="up-dialogue" className="up-title">
              A quiet doorway
            </h1>
            <p className="up-closing" aria-live="polite">
              {view.dialogue.speakerName}: “{view.dialogue.text}”
            </p>
            <button
              className="up-btn"
              type="button"
              disabled={busy}
              onClick={() => void run({ type: 'advance-dialogue' })}
            >
              Continue
            </button>
          </section>
        ) : null}

        {view.screen === 'portal' ? (
          <section className="up-stage" aria-labelledby="up-portal">
            <h1 id="up-portal" className="up-title">
              First Portal
            </h1>
            <p className="up-copy">{view.missionTitle}</p>
            <p className="up-copy">
              A small machine is dark. Choose a part, then the part it should feed. Color is a hint, not the only
              signal — each part has a name.
            </p>
            <div className="up-machine">
              <p>Links: {view.edges.length === 0 ? 'none yet' : view.edges.map((edge) => `${edge.from} → ${edge.to}`).join(', ')}</p>
            </div>
            <p className="up-live" aria-live="assertive">
              {view.retryMessage ?? (selectedFrom ? `Selected ${selectedFrom}. Now choose what it feeds.` : '')}
            </p>
            <div className="up-nodes">
              {view.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className="up-card"
                  data-selected={selectedFrom === node.id}
                  aria-pressed={selectedFrom === node.id}
                  disabled={busy}
                  onClick={() => onConnect(node.id)}
                >
                  <span className="up-kicker">{node.role}</span>
                  <h2>{node.label}</h2>
                  <p>{node.id}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {view.screen === 'complete' ? (
          <section className="up-stage" aria-labelledby="up-done">
            <h1 id="up-done" className="up-title">
              The machine breathes
            </h1>
            <p className="up-copy">You restored INPUT, PROCESS, and OUTPUT.</p>
            <div className="up-rewards">
              {view.inventory.map((item) => (
                <article key={item.id} className="up-card" tabIndex={0}>
                  <span className="up-kicker">{item.family.replace('-', ' ')}</span>
                  <h2>{item.name}</h2>
                  <p>{item.knowledge}</p>
                </article>
              ))}
            </div>
            <button
              className="up-btn"
              type="button"
              disabled={busy}
              onClick={() => void run({ type: 'return-to-nexus' })}
            >
              Return to {view.worldName}
            </button>
          </section>
        ) : null}

        {DEBUG ? (
          <details className="up-debug">
            <summary>Dev panel</summary>
            <p>session {view.debug.sessionId ?? 'none'}</p>
            <p>mission {view.missionTitle ?? 'none'}</p>
            <p>game {view.debug.gameSchemaVersion}</p>
            <p>universe {view.debug.canonVersion}</p>
            <p>foundation {view.debug.foundationVersion ?? 'unread'}</p>
            <p>storage {view.storageKey || PLAY_STORAGE_KEY}</p>
            <pre>{view.events.map((event) => event.type).join('\n')}</pre>
            <pre>{JSON.stringify(view.inventory.map((item) => item.id), null, 2)}</pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
