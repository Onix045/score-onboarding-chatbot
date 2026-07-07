export function LoadingIndicator() {
  return (
    <div
      role="status"
      aria-label="S.C.O.R.E. Guide is typing"
      className="flex w-fit items-center gap-1 rounded-2xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800"
    >
      <span className="sr-only">S.C.O.R.E. Guide is typing</span>
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
    </div>
  );
}
