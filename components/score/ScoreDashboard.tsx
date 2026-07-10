import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { ArrowRightIcon, CartIcon, PackageIcon, TrendingUpIcon, TruckIcon } from "./icons";

const FEATURES = [
  {
    icon: PackageIcon,
    title: "Inventory",
    description: "Track products, stock levels, and low-stock alerts in real time.",
  },
  {
    icon: CartIcon,
    title: "Sales & POS",
    description:
      "Ring up sales, take payments, and keep a clean order history, included free on every plan.",
  },
  {
    icon: TruckIcon,
    title: "Suppliers",
    description: "Manage vendors and contacts, and restock with confidence.",
  },
  {
    icon: TrendingUpIcon,
    title: "Reports",
    description: "See revenue, top sellers, and stock health at a glance.",
  },
] as const;

const STATS = [
  { value: "4-in-1", label: "All-in-one toolkit" },
  { value: "24/7", label: "Setup guide chat" },
  { value: "$0", label: "Free to start" },
  { value: "30-day", label: "Free Pro trial" },
] as const;

export function ScoreDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[url('/image_landing.jpg')] bg-cover bg-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-slate-950/55"
          />

          <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-28 text-center sm:py-36">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cerulean-300">
              Small business toolkit
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Run your whole small business in one place
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-200">
              SCORE helps small businesses manage inventory, sales, suppliers, and reports,
              simple, fast, and built to grow with you.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-x-6 gap-y-4 sm:flex-row">
              <button className="btn-primary px-6 py-3 text-base" type="button">
                Start Free Trial
              </button>
              <button
                className="group inline-flex items-center gap-1.5 text-base font-medium text-white/85 transition hover:text-white"
                type="button"
              >
                See All Plans
                <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            </div>

            <p className="mt-8 text-sm text-white/60">
              30-day free trial · No credit card · Cancel anytime
            </p>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
          <dl className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0 dark:divide-slate-800">
            {STATS.map((stat) => (
              <div className="px-6 py-8 text-center" key={stat.label}>
                <dd className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  {stat.value}
                </dd>
                <dt className="mt-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        <section id="features">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything you need to run the shop
              </h2>
              <p className="mt-3 text-pretty text-slate-500 dark:text-slate-400">
                Four tools that work together, no spreadsheets, no juggling apps.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  className="surface-card p-6 transition duration-200 hover:border-slate-300 dark:hover:border-slate-700"
                  key={feature.title}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cerulean-50 text-cerulean-600 dark:bg-cerulean-950/50 dark:text-cerulean-400">
                    <feature.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
          id="contact"
        >
          <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:py-24">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Ready to run your business smarter?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-pretty text-slate-500 dark:text-slate-400">
              Start free in minutes, upgrade to Pro when you&apos;re ready to grow.
            </p>
            <button className="btn-primary mt-8 px-6 py-3 text-base" type="button">
              Start Free Trial
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
