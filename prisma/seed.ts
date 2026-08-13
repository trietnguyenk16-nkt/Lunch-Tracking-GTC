import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const employees = await Promise.all([
    prisma.employee.upsert({ where: { id: "seed-alice" }, update: {}, create: { id: "seed-alice", name: "Alice" } }),
    prisma.employee.upsert({ where: { id: "seed-bob" }, update: {}, create: { id: "seed-bob", name: "Bob" } }),
    prisma.employee.upsert({ where: { id: "seed-charlie" }, update: {}, create: { id: "seed-charlie", name: "Charlie" } }),
  ]);

  const lunch = await prisma.expense.upsert({
    where: { id: "seed-lunch" },
    update: {},
    create: {
      id: "seed-lunch",
      name: "Team lunch",
      category: "Lunch",
      amountMinor: 12000,
      currency: "USD",
      paidById: employees[0]!.id,
      occurredAt: new Date("2026-08-13T12:00:00.000Z"),
      shares: {
        create: employees.map((employee, index) => ({
          employeeId: employee.id,
          amountMinor: index === 0 ? 4000 : 4000,
        })),
      },
    },
  });

  console.log(`Seeded ${employees.length} employees and expense ${lunch.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
