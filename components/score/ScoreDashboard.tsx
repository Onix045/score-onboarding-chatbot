interface SummaryCardProps {
  title: string;
  value: string;
}

function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700">
      <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</h3>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function ScoreDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-10">
      <header className="flex flex-col gap-3">
        <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Demonstration
        </span>
        <h1 className="text-3xl font-bold">S.C.O.R.E.</h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-300">
          S.C.O.R.E. (Small Company Operations &amp; Resource Engine) is a simple, all-in-one
          workspace for small businesses. Keep track of what you have, ring up sales, remember
          your customers, and see how business is going, all in one place.
        </p>
      </header>

      <section aria-label="Business summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Inventory" value="128 items tracked" />
        <SummaryCard title="Sales" value="$1,240 this week" />
        <SummaryCard title="Customers" value="42 customers" />
        <SummaryCard title="Reports" value="4 reports available" />
      </section>

      <section
        aria-labelledby="low-stock-heading"
        className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700"
      >
        <h2 id="low-stock-heading" className="text-lg font-semibold">
          Low stock example
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-700">
          <li className="flex items-center justify-between py-2 text-sm">
            <span>Canvas tote bags</span>
            <span className="font-medium text-red-600 dark:text-red-400">3 left</span>
          </li>
          <li className="flex items-center justify-between py-2 text-sm">
            <span>Hand-poured candles</span>
            <span className="font-medium text-red-600 dark:text-red-400">5 left</span>
          </li>
        </ul>
      </section>

      <section
        aria-labelledby="recent-activity-heading"
        className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700"
      >
        <h2 id="recent-activity-heading" className="text-lg font-semibold">
          Recent activity example
        </h2>
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-700">
          <li className="py-2 text-sm">Sold 2 candles to Maria G.</li>
          <li className="py-2 text-sm">Added 20 tote bags to inventory</li>
          <li className="py-2 text-sm">Updated contact info for Carlos R.</li>
        </ul>
      </section>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Everything on this page is example demonstration data. No real business information is
        shown or stored.
      </p>
    </div>
  );
}
