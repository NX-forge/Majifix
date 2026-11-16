import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ passwordReset?: string }> }) {
  const query = await searchParams;
  return <div className="auth-wrap"><div style={{ width: "min(460px, 100%)"}}>{query.passwordReset && <div className="notice">Your password has been changed. Sign in with your new password.</div>}<AuthForm mode="login" /></div></div>;
}
