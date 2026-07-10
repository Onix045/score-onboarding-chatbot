"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LaunchIcon, LogInIcon, MailIcon, MenuIcon } from "./icons";

const NAV_LINK_CLASS =
  "px-3 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link aria-label="S.C.O.R.E." className="flex items-center" href="/">
          <Image
            alt="S.C.O.R.E."
            className="h-10 w-auto sm:h-14 dark:hidden"
            height={56}
            priority
            src="/score_logo.png"
            width={180}
          />
          <Image
            alt="S.C.O.R.E."
            className="hidden h-10 w-auto sm:h-14 dark:block"
            height={56}
            priority
            src="/score_logo_2.png"
            width={180}
          />
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <Link className={NAV_LINK_CLASS} href="#contact">
            Contact
          </Link>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <button className="btn-secondary px-4" type="button">
            Sign in
          </button>
          <button className="btn-primary px-4" type="button">
            Start Free Trial
          </button>
        </nav>

        <div className="sm:hidden">
          <button
            aria-expanded={menuOpen}
            aria-label="Menu"
            className="btn-secondary h-9 w-9 justify-center px-0"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white p-3 sm:hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <button className="btn-primary w-full justify-center" type="button">
              <LaunchIcon className="h-4 w-4" />
              Start Free Trial
            </button>
            <button
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200"
              type="button"
            >
              <LogInIcon className="h-4 w-4 text-slate-400" />
              Sign in
            </button>
            <Link
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200"
              href="#contact"
              onClick={() => setMenuOpen(false)}
            >
              <MailIcon className="h-4 w-4 text-slate-400" />
              Contact
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
