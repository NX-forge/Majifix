type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Sends transactional authentication email through Resend.
 * In local development only, the URL is printed so the flow can be tested
 * without configuring an email provider. Production never falls back to logs.
 */
export async function sendAuthEmail(email: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required for authentication email delivery.");
    }

    console.info(`[MajiFix local email preview]\nTo: ${email.to}\nSubject: ${email.subject}\n${email.text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new Error(`Authentication email delivery failed (${response.status}): ${responseBody.slice(0, 500)}`);
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function authEmailTemplate(title: string, message: string, url: string, action: string) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeUrl = escapeHtml(url);
  const safeAction = escapeHtml(action);

  return {
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#102a43"><h1>${safeTitle}</h1><p>${safeMessage}</p><p><a href="${safeUrl}" style="display:inline-block;background:#087e8b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${safeAction}</a></p><p style="font-size:13px;color:#627d98">If you did not request this, you can ignore this email.</p><p style="font-size:12px;color:#627d98">MajiFix · From broken pumps to restored water.</p></div>`,
    text: `${title}\n\n${message}\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
  };
}
