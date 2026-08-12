import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const URL = process.env['SUPABASE_URL'] ?? '';
const KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!URL || !KEY) {
  console.error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set di .env');
  process.exit(1);
}

const supabase = createClient(URL, KEY);

async function findAuthUserByEmail(email: string): Promise<{ id: string; user_metadata: Record<string, unknown> } | null> {
  const filter = encodeURIComponent(email);
  const res = await fetch(`${URL}/auth/v1/admin/users?filter=${filter}`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });

  if (!res.ok) {
    console.error(`  [!] Gagal cari ${email}: HTTP ${res.status}`);
    return null;
  }

  const json = (await res.json()) as {
    users?: { id: string; email?: string; user_metadata?: Record<string, unknown> }[];
  };

  const found = json.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return found ? { id: found.id, user_metadata: found.user_metadata ?? {} } : null;
}

async function main(): Promise<void> {
  const employees = await prisma.employee.findMany();

  console.log(`Total employee di DB: ${employees.length}`);

  let created = 0;
  let skipped = 0;
  let noEmail = 0;
  let failed = 0;

  for (const emp of employees) {
    if (!emp.email) {
      console.log(`SKIP (tanpa email): ${emp.name} (${emp.employeeId})`);
      noEmail += 1;
      continue;
    }

    const existing = await findAuthUserByEmail(emp.email);

    if (existing) {
      const metadata = {
        ...existing.user_metadata,
        name: emp.name,
        employee_id: emp.employeeId,
      };

      if (
        metadata.name !== emp.name ||
        metadata.employee_id !== emp.employeeId
      ) {
        const { error } = await supabase.auth.admin.updateUserById(existing.id, {
          user_metadata: metadata,
        });
        if (error) {
          console.error(`  [!] Gagal update metadata ${emp.email}: ${error.message}`);
          failed += 1;
          continue;
        }
        console.log(`UPDATE metadata: ${emp.email} -> ${emp.employeeId}`);
      } else {
        console.log(`OK (sudah ada): ${emp.email} [${existing.id}]`);
      }
      skipped += 1;
      continue;
    }

    if (!emp.password) {
      console.log(`SKIP (tanpa password internal): ${emp.name} (${emp.employeeId})`);
      noEmail += 1;
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      email: emp.email,
      password: emp.password,
      email_confirm: true,
      user_metadata: { name: emp.name, employee_id: emp.employeeId },
    });

    if (error) {
      console.error(`  [!] Gagal create ${emp.email}: ${error.message}`);
      failed += 1;
      continue;
    }

    console.log(`CREATE: ${emp.email} (${emp.name}) -> ${emp.employeeId}`);
    created += 1;
  }

  console.log('\n=== RINGKASAN ===');
  console.log(`Created : ${created}`);
  console.log(`Updated : ${skipped}`);
  console.log(`Tanpa email/password: ${noEmail}`);
  console.log(`Failed  : ${failed}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });