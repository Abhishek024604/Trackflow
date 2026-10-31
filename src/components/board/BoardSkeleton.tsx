/** Placeholder board shown while issues load. */
export function BoardSkeleton({ columns = 3 }: { columns?: number }) {
  return (
    <div role="status" aria-label="Loading board" className="flex gap-4 overflow-hidden">
      {Array.from({ length: columns }).map((_, col) => (
        <div key={col} className="w-72 flex-shrink-0 rounded-lg bg-zinc-900/60 p-3">
          <div className="mb-4 h-4 w-24 animate-pulse rounded bg-zinc-800" />
          {Array.from({ length: 3 - (col % 2) }).map((__, row) => (
            <div key={row} className="mb-2 rounded-md border border-zinc-800 bg-zinc-900 p-3">
              <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
              <div className="mb-3 h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
              <div className="flex justify-between">
                <div className="h-4 w-14 animate-pulse rounded bg-zinc-800" />
                <div className="h-5 w-5 animate-pulse rounded-full bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ))}
      <span className="sr-only">Loading board…</span>
    </div>
  );
}
