import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { authEmailTemplate, sendAuthEmail } from "@/lib/email";
import { isAccountActive } from "@/lib/access-control";

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();

if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}
if (process.env.NODE_ENV === "production" && (!process.env.BETTER_AUTH_URL || !process.env.NEXT_PUBLIC_APP_URL)) {
  throw new Error("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must both be configured in production.");
}
if (process.env.NODE_ENV === "production" && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)) {
  throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured in production to support account verification and recovery.");
}

function dispatchAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  message: string;
  url: string;
  action: string;
}) {
  const template = authEmailTemplate(input.title, input.message, input.url, input.action);
  void sendAuthEmail({ to: input.to, subject: input.subject, ...template }).catch((error: unknown) => {
    console.error("MajiFix authentication email could not be delivered.", error);
  });
}

export const auth = betterAuth({
  appName: "MajiFix",
  baseURL,
  secret: authSecret,
  database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
  trustedOrigins: Array.from(new Set([
    process.env.NEXT_PUBLIC_APP_URL ?? baseURL,
    baseURL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? []),
  ])),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 30,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      dispatchAuthEmail({
        to: user.email,
        subject: "Reset your MajiFix password",
        title: "Reset your password",
        message: "Use the secure link below to choose a new MajiFix password. This link expires in 30 minutes.",
        url,
        action: "Reset password",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      dispatchAuthEmail({
        to: user.email,
        subject: "Verify your MajiFix email address",
        title: "Verify your email address",
        message: "Confirm that this email address belongs to you. After verification, an administrator must activate your account before you can use MajiFix.",
        url,
        action: "Verify email address",
      });
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "COMMUNITY", input: false },
      accountStatus: { type: "string", required: false, defaultValue: "PENDING", input: false },
      phone: { type: "string", required: false, input: true },
    },
  },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
    freshAge: 60 * 5,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/send-verification-email": { window: 60 * 10, max: 3 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { accountStatus: true },
          });

          if (!user || !isAccountActive(user.accountStatus)) {
            throw new APIError("FORBIDDEN", {
              message: "Your account is awaiting administrator approval or is suspended.",
            });
          }

          return { data: session };
        },
      },
    },
  },
});
