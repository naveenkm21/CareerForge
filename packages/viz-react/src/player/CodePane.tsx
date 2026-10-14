'use client';

import { useEffect, useMemo, useRef } from 'react';
import { LANG_LABELS, LANGS, type CodeSource, type Lang } from '@careerforge/viz';
import { cn } from '@careerforge/ui';
import { TOKEN_COLORS, tokenizeLine } from '../highlight';

/**
 * Source listing with the current step's anchor lines highlighted. The same trace drives every
 * language via named anchors (ADR-005) — no compiler in the loop.
 */
export function CodePane({
  sources,
  lang,
  onLang,
  anchor,
}: {
  sources: Partial<Record<Lang, CodeSource>>;
  lang: Lang;
  onLang: (l: Lang) => void;
  anchor: string | undefined;
}) {
  const source = sources[lang];
  const lines = useMemo(
    () => (source ? source.code.split('\n').map((l) => tokenizeLine(l, lang)) : []),
    [source, lang],
  );
  const active = new Set(anchor && source ? (source.anchors[anchor] ?? []) : []);
  const scroller = useRef<HTMLDivElement>(null);
  const first = Math.min(...active);

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>(`[data-line="${first}"]`);
    const box = scroller.current;
    if (!el || !box) return;
    // Scroll only the pane, never the page.
    const top = el.offsetTop - box.clientHeight / 3;
    if (el.offsetTop < box.scrollTop + 8 || el.offsetTop > box.scrollTop + box.clientHeight - 40) {
      box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, [first, lang]);

  const available = LANGS.filter((l) => sources[l]);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-[var(--code-bg)]">
      <div
        role="tablist"
        aria-label="Code language"
        className="flex gap-0.5 border-b border-border px-2 pt-1.5"
      >
        {available.map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={l === lang}
            onClick={() => onLang(l)}
            className={cn(
              '-mb-px rounded-t-md border border-transparent px-3 py-1.5 text-xs font-medium transition-colors',
              l === lang
                ? 'border-border border-b-[var(--code-bg)] bg-[var(--code-bg)] text-fg'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>
      <div
        ref={scroller}
        className="relative max-h-[22rem] min-h-40 overflow-auto py-2 lg:max-h-[30rem]"
      >
        <pre
          className="font-mono text-[12.5px] leading-[1.7]"
          style={{ fontVariantLigatures: 'none' }}
        >
          <code>
            {lines.map((tokens, i) => {
              const n = i + 1;
              const on = active.has(n);
              return (
                <div
                  key={n}
                  data-line={n}
                  aria-current={on ? 'step' : undefined}
                  className="flex border-l-[3px] pr-4 transition-colors duration-200"
                  style={{
                    background: on ? 'var(--code-hl)' : undefined,
                    borderColor: on ? 'var(--code-hl-border)' : 'transparent',
                  }}
                >
                  <span className="w-9 shrink-0 pr-3 text-right text-fg-subtle select-none">
                    {n}
                  </span>
                  <span className="whitespace-pre">
                    {tokens.map((t, k) => (
                      <span
                        key={k}
                        style={{
                          color: TOKEN_COLORS[t.kind],
                          fontStyle: t.kind === 'com' ? 'italic' : undefined,
                        }}
                      >
                        {t.text}
                      </span>
                    ))}
                    {tokens.length === 0 && ' '}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
