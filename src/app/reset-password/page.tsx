import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const query = await searchParams;
  return <div className="auth-wrap"><ResetPasswordForm token={query.token} invalidLink={query.error === "INVALID_TOKEN"} /></div>;
}
