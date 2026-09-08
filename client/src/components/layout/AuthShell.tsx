import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

const HIGHLIGHTS = [
  "Kanban boards with drag-and-drop planning",
  "Roles and permissions for every teammate",
  "Progress, workload and activity at a glance",
];

/** Marketing panel on the left, form on the right - shared by login and register. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, #818cf8 0%, transparent 60%), radial-gradient(50% 50% at 90% 80%, #38bdf8 0%, transparent 55%)",
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
              <path
                d="M10 22V10l12 12V10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight">NOVA</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Plan. Collaborate. Deliver.
          </h1>
          <p className="mt-4 text-brand-100">
            One place for your projects, tasks and team - so everyone knows what is happening and
            what is next.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-brand-50">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-brand-200">Team productivity, without the busywork.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
                <path
                  d="M10 22V10l12 12V10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        </div>
      </main>
    </div>
  );
}
