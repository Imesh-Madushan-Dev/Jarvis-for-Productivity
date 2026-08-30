import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-safe-t">
      <div className="w-full max-w-sm">
        <div className="t-rise">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Moly
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your day, planned with an assistant that can actually change it.
          </p>
        </div>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
