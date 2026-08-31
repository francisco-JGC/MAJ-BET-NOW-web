import { type FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useLogin } from '@/features/auth/hooks/use-login';
import { APP_ROUTES } from '@/shared/constants/routes';

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname
    ?? APP_ROUTES.home;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    login.mutate(
      { username, password },
      {
        onError: (apiError) => setError(apiError.message),
        onSuccess: () => navigate(from, { replace: true }),
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="MajbetNow"
            className="size-28 object-contain drop-shadow-md"
          />
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            MajbetNow <span className="text-primary">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Panel de administración
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border/60 bg-card p-6 shadow-lg shadow-slate-900/5"
        >
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">
              Iniciar sesión
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresa con tus credenciales de administrador
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Usuario" htmlFor="login-username">
              <InputWithIcon icon={<User className="size-4" />}>
                <input
                  id="login-username"
                  className="w-full h-11 rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </InputWithIcon>
            </Field>

            <Field label="Contraseña" htmlFor="login-password">
              <InputWithIcon
                icon={<Lock className="size-4" />}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                }
              >
                <input
                  id="login-password"
                  className="w-full h-11 rounded-lg border border-input bg-background pl-10 pr-11 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </InputWithIcon>
            </Field>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2.5 border border-destructive/20"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-6 inline-flex w-full h-11 items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm transition hover:brightness-105 active:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {login.isPending && <Loader2 className="size-4 animate-spin" />}
            {login.isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MajbetNow
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function InputWithIcon({
  icon,
  trailing,
  children,
}: {
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
      {trailing && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </div>
  );
}
