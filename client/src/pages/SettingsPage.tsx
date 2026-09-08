import { useState } from "react";
import toast from "react-hot-toast";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { PROJECT_COLORS } from "../lib/constants";
import { classNames } from "../lib/format";
import type { User } from "../lib/types";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name ?? "",
    title: user?.title ?? "",
    avatarColor: user?.avatarColor ?? PROJECT_COLORS[0],
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const { user: updated } = await api.patch<{ user: User }>("/auth/me", {
        name: profile.name.trim(),
        title: profile.title.trim() || null,
        avatarColor: profile.avatarColor,
      });
      setUser(updated);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage how you appear to your team.</p>
      </header>

      <form onSubmit={saveProfile} className="card space-y-5 p-5">
        <h2 className="font-semibold text-slate-900">Profile</h2>

        <div className="flex items-center gap-4">
          <Avatar
            user={{ name: profile.name || "?", avatarColor: profile.avatarColor }}
            size="lg"
          />
          <div>
            <p className="text-sm font-medium text-slate-700">Avatar colour</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use colour ${color}`}
                  onClick={() => setProfile({ ...profile, avatarColor: color })}
                  style={{ backgroundColor: color }}
                  className={classNames(
                    "h-6 w-6 rounded-full transition-transform",
                    profile.avatarColor === color
                      ? "scale-110 ring-2 ring-slate-900 ring-offset-2"
                      : "hover:scale-110",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              className="input"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              minLength={2}
              maxLength={60}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="profile-title">
              Role at work
            </label>
            <input
              id="profile-title"
              className="input"
              value={profile.title}
              onChange={(e) => setProfile({ ...profile, title: e.target.value })}
              maxLength={60}
              placeholder="Product Engineer"
            />
          </div>
        </div>

        <div>
          <span className="label">Email</span>
          <input className="input" value={user?.email ?? ""} disabled />
          <p className="mt-1 text-xs text-slate-400">
            Your email is used to sign in and to receive project invitations.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={savingProfile}>
            Save profile
          </Button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card space-y-5 p-5">
        <h2 className="font-semibold text-slate-900">Password</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="current-password">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              className="input"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className="input"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={savingPassword}>
            Change password
          </Button>
        </div>
      </form>
    </div>
  );
}
