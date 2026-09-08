import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useProjects } from "../../hooks/useProjects";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ProjectFormModal } from "../projects/ProjectFormModal";
import { classNames } from "../../lib/format";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
  { to: "/my-tasks", label: "My tasks", icon: CheckSquare, end: false },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects } = useProjects();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // On small screens the sidebar is a drawer: navigating should close it.
  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/" className="flex items-center gap-2.5 px-2 py-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
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
        <span>
          <span className="block text-base font-bold leading-tight tracking-tight text-slate-900">
            NOVA
          </span>
          <span className="block text-[11px] leading-tight text-slate-500">
            Plan. Collaborate. Deliver.
          </span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              classNames(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your projects
          </span>
          <button
            onClick={() => setCreating(true)}
            aria-label="New project"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-thin max-h-[calc(100vh-24rem)] overflow-y-auto">
          {(projects ?? []).slice(0, 12).map((project) => (
            <NavLink
              key={project.id}
              to={`/projects/${project.id}`}
              className={({ isActive }) =>
                classNames(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50",
                )
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: project.color }}
              />
              <span className="truncate">{project.name}</span>
            </NavLink>
          ))}
          {projects?.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No projects yet</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-100"
        >
          <Avatar user={user} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">{user?.name}</span>
            <span className="block truncate text-xs text-slate-500">{user?.email}</span>
          </span>
          <Settings className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold tracking-tight text-slate-900">NOVA</span>
        <Button size="sm" className="ml-auto" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
          New
        </Button>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-up bg-white shadow-pop">
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
