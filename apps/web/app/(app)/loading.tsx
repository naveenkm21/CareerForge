export default function Loading() {
  return (
    <main
      className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-9 w-64 animate-pulse rounded-md bg-surface-3" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="h-56 animate-pulse rounded-[var(--radius)] bg-surface-2" />
        <div className="h-56 animate-pulse rounded-[var(--radius)] bg-surface-2" />
      </div>
      <div className="h-96 animate-pulse rounded-[var(--radius)] bg-surface-2" />
    </main>
  );
}
