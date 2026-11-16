import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: pnpm admin:promote user@example.com");
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account exists for ${email}. Register the account before promoting it.`);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    await tx.auditLog.create({
      data: {
        actorId: "system:bootstrap",
        actorEmail: "system:bootstrap",
        action: "INITIAL_ADMIN_PROMOTED",
        entityType: "User",
        entityId: user.id,
        metadata: { email },
      },
    });
  });
  console.info(`Administrator role assigned to ${email}.`);
} finally {
  await prisma.$disconnect();
}
