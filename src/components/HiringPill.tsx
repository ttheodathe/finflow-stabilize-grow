/** Small "We're hiring" status pill used next to the Careers links. Static, no animation. */
export function HiringPill({ label = "We\u2019re hiring" }: { label?: string }) {
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 align-middle text-[10px] font-bold uppercase leading-none tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}
