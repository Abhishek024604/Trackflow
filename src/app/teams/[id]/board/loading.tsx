import { BoardSkeleton } from '@/components/board/BoardSkeleton';

export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] p-4">
      <div className="mb-6 h-5 w-40 animate-pulse rounded bg-zinc-800" />
      <BoardSkeleton />
    </div>
  );
}
