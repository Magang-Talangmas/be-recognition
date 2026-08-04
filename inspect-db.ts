import { getPrismaClient } from './src/lib/prisma/client';

async function main() {
  const prisma = getPrismaClient();
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position`,
  );
  console.log(JSON.stringify(cols, null, 2));
  const idx = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename='employees'`,
  );
  console.log('INDEXES:', JSON.stringify(idx));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });