import { config as loadEnv } from "dotenv";
loadEnv({ path: process.env.TEST_ENV_FILE ?? ".env" });

const [{ PrismaClient }, { PrismaPg }, { auth }] = await Promise.all([
  import("../src/generated/prisma/client"),
  import("@prisma/adapter-pg"),
  import("../src/lib/auth"),
]);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required before seeding.");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 10) throw new Error("Set SEED_DEMO_PASSWORD to a password of at least 10 characters before seeding.");
  const users = [
    { name: "MajiFix Demo Admin", email: "admin@demo.majifix.local", role: "ADMIN" as const },
    { name: "Demo Water Operator", email: "operator@demo.majifix.local", role: "OPERATOR" as const },
    { name: "Demo Technician", email: "technician@demo.majifix.local", role: "TECHNICIAN" as const },
    { name: "Demo Community Reporter", email: "community@demo.majifix.local", role: "COMMUNITY" as const },
  ];
  const records = new Map<string,string>();
  for (const item of users) {
    let user = await prisma.user.findUnique({ where: { email: item.email } });
    if (!user) {
      await auth.api.signUpEmail({ body: { name: item.name, email: item.email, password: demoPassword } });
      user = await prisma.user.findUnique({ where: { email: item.email } });
    }
    if (!user) throw new Error(`Could not create demo user ${item.email}`);
    user = await prisma.user.update({ where: { id: user.id }, data: { name: item.name, role: item.role, accountStatus: "ACTIVE", suspendedAt: null, suspensionReason: null, emailVerified: true } });
    records.set(item.role,user.id);
  }
  await prisma.technicianProfile.upsert({ where: { userId: records.get("TECHNICIAN")! }, update: { skills: ["Pump repair", "Electrical"], serviceAreas: ["Kitui"], available: true }, create: { userId: records.get("TECHNICIAN")!, skills: ["Pump repair", "Electrical"], serviceAreas: ["Kitui"], available: true } });
  const point = await prisma.waterPoint.upsert({ where: { code: "DEMO-KIT-BH-001" }, update: {}, create: { code: "DEMO-KIT-BH-001", name: "SIMULATED Demo Kavaini Community Borehole", type: "BOREHOLE", county: "Kitui", subCounty: "SIMULATED Demo Sub-county", community: "SIMULATED Demo Kavaini", peopleServed: 350, servesSchool: true, alternativeWaterAvailable: false, status: "NON_OPERATIONAL", operatorId: records.get("OPERATOR") } });
  // Twenty-four fully synthetic water points give the demo enough records to explore filters and reporting.
  for (let index = 2; index <= 24; index += 1) {
    const sequence = String(index).padStart(3, "0");
    await prisma.waterPoint.upsert({
      where: { code: `DEMO-KIT-WP-${sequence}` },
      update: {},
      create: {
        code: `DEMO-KIT-WP-${sequence}`,
        name: `SIMULATED Demo Water Point ${sequence}`,
        type: index % 3 === 0 ? "HANDPUMP" : index % 3 === 1 ? "BOREHOLE" : "MOTORISED_SYSTEM",
        county: "Kitui",
        subCounty: "SIMULATED Demo Sub-county",
        community: `SIMULATED Demo Community ${sequence}`,
        peopleServed: 80 + index * 17,
        servesSchool: index % 5 === 0,
        servesHealthFacility: index % 7 === 0,
        alternativeWaterAvailable: index % 4 !== 0,
        status: "OPERATIONAL",
        operatorId: records.get("OPERATOR"),
      },
    });
  }
  const fault = await prisma.faultReport.upsert({ where: { reference: "MF-DEMO-0001" }, update: {}, create: { reference: "MF-DEMO-0001", waterPointId: point.id, reporterId: records.get("COMMUNITY")!, category: "PUMP_FAILURE", description: "SIMULATED DEMO: The borehole pump has stopped working. Water is not available from this point.", peopleAffected: 350, downtimeHours: 30, allServiceInterrupted: true, alternativeWaterAvailable: false, priority: "CRITICAL", priorityScore: 10, status: "REPORTED", updates: { create: { authorId: records.get("COMMUNITY")!, status: "REPORTED", notes: "SIMULATED DEMO: Sample fault report created by the seed script." } } } });
  console.info(`Seed complete. Demo water point: ${point.code}; demo fault: ${fault.reference}`);
  console.info("Demo accounts: admin@demo.majifix.local, operator@demo.majifix.local, technician@demo.majifix.local, community@demo.majifix.local");
  console.info("All four accounts use SEED_DEMO_PASSWORD. Demo data is simulated.");
}

main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(async()=>{await prisma.$disconnect();});
