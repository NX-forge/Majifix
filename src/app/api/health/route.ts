import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readiness probe. Does not expose database details or exception messages. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", checks: { database: "ok" } },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    console.error("MajiFix readiness check failed.", error);
    return NextResponse.json(
      { status: "unavailable", checks: { database: "unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0", "Retry-After": "30", "X-Content-Type-Options": "nosniff" } },
    );
  }
}
