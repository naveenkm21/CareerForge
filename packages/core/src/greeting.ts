/** Local hour for an IANA timezone. `now` is injected so this stays pure. */
export function localHour(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone,
  }).format(now);
  return Number(hour) % 24;
}

export function greetingFor(now: Date, timeZone: string): string {
  const h = localHour(now, timeZone);
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
