import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | undefined;

function getPrisma(): PrismaClient {
  prisma ??= new PrismaClient();
  return prisma;
}

type VercelRequest = { method?: string };
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }
  if (!process.env.DATABASE_URL) {
    res.status(503).json({ ok: false, database: "not_configured" });
    return;
  }

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    res.status(200).json({ ok: true, database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
}
