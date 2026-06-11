import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminCode = process.env.ADMIN_INVITE_CODE;
  if (!adminCode) {
    console.error("ADMIN_INVITE_CODE env var is required for seeding");
    process.exit(1);
  }

  await prisma.user.upsert({
    where: { inviteCode: adminCode },
    update: {},
    create: {
      inviteCode: adminCode,
      role: "ADMIN",
      name: "Admin",
      activatedAt: new Date(),
    },
  });

  console.log(`Admin user created with invite code: ${adminCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
