import { MailIcon } from "./icons";

const FOOTER_LINK_CLASS =
  "text-sm text-slate-500 transition hover:text-cerulean-600 dark:text-slate-400 dark:hover:text-cerulean-400";

const FOOTER_HEADING_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-200";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-y-8 sm:grid-cols-4 sm:gap-8">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">S.C.O.R.E.</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Small Company Operations &amp; Resource Engine
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                aria-label="Email"
                className="text-slate-400 transition hover:text-cerulean-600 dark:text-slate-500 dark:hover:text-cerulean-400"
                href="mailto:contact@ruraltechnologies.co"
                rel="noreferrer"
                target="_blank"
              >
                <MailIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-4 sm:contents">
            <div>
              <h3 className={FOOTER_HEADING_CLASS}>Product</h3>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <button className={FOOTER_LINK_CLASS} type="button">
                    Sign in
                  </button>
                </li>
                <li>
                  <button className={FOOTER_LINK_CLASS} type="button">
                    Start Free Trial
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={FOOTER_HEADING_CLASS}>Company</h3>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <a className={FOOTER_LINK_CLASS} href="#contact">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={FOOTER_HEADING_CLASS}>Legal</h3>
              <ul className="mt-3 space-y-2.5">
                <li>
                  <a className={FOOTER_LINK_CLASS} href="#">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a className={FOOTER_LINK_CLASS} href="#">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {year} RURAL Technologies. All rights reserved.
          </p>
          <span className="text-xs text-slate-400 dark:text-slate-500">Available in English</span>
        </div>
      </div>
    </footer>
  );
}
