import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  const [form, setForm] = useState({ name: "", email: "", title: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        title: form.title.trim() || undefined,
        password: form.password,
        ...(inviteToken ? { inviteToken } : {}),
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create your account"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        inviteToken
          ? "Finish signing up to join the project you were invited to."
          : "Start planning work with your team in a couple of minutes."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jagrat Singh"
            minLength={2}
            maxLength={60}
            autoComplete="name"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="title">
            Role at work <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="title"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Frontend Engineer"
            maxLength={60}
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" loading={pending}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
