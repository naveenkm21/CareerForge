'use client';

import { useEffect, useState } from 'react';

export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  // Starts null so server and client render the same placeholder (no hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null)
    return <span className="font-mono text-2xl font-semibold text-fg-subtle">--:--</span>;
  const left = Math.max(0, Math.round((end - now) / 1000));
  return (
    <span
      role="timer"
      aria-live="off"
      className={`font-mono text-2xl font-semibold tabular-nums ${left < 120 ? 'text-tone-error' : 'text-fg'}`}
    >
      {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}
