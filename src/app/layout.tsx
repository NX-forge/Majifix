import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "MajiFix | Restore water, faster", template: "%s | MajiFix" },
  description: "A community-first platform for reporting, coordinating and confirming repairs to rural water points.",
  applicationName: "MajiFix",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
