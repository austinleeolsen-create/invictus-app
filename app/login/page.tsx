import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">I</div>
        <p className="eyebrow">Invictus Basketball Club</p>
        <h1>Welcome to the Hub</h1>
        <p className="muted">Sign in with your Invictus account to continue.</p>
        <form action={signIn} className="login-form">
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
