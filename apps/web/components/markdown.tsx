import { Fragment, type ReactNode } from 'react';

/**
 * A deliberately tiny Markdown renderer for curriculum text: paragraphs, headings, lists,
 * blockquotes, **bold**, *italic*, `code` and [links](/path). It builds React elements — never
 * HTML strings — so content can't inject markup.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  const blocks = children
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/);
  return (
    <div className={className ?? 'flex flex-col gap-3 text-[15px] leading-relaxed text-fg'}>
      {blocks.map((b, i) => (
        <Block key={i} text={b} />
      ))}
    </div>
  );
}

function Block({ text }: { text: string }) {
  const lines = text.split('\n');
  if (lines.every((l) => /^\s*[-*] /.test(l)))
    return (
      <ul className="list-disc space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>{inline(l.replace(/^\s*[-*] /, ''))}</li>
        ))}
      </ul>
    );
  if (lines.every((l) => /^\s*\d+\. /.test(l)))
    return (
      <ol className="list-decimal space-y-1 pl-5">
        {lines.map((l, i) => (
          <li key={i}>{inline(l.replace(/^\s*\d+\. /, ''))}</li>
        ))}
      </ol>
    );
  if (lines.every((l) => l.startsWith('>')))
    return (
      <blockquote className="border-l-4 border-accent bg-accent-soft/40 px-4 py-2 text-fg">
        {inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}
      </blockquote>
    );
  const h = /^(#{1,3})\s+(.*)$/.exec(text);
  if (h) return <h3 className="text-base font-semibold text-fg">{inline(h[2]!)}</h3>;
  return <p>{inline(lines.join(' '))}</p>;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2]!;
      const safe = href.startsWith('/') || href.startsWith('https://');
      return safe ? (
        <a key={i} href={href} className="font-medium text-accent hover:underline">
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
