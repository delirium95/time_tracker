import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import os from "os";

export function createTestDb() {
  const dbFile = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = new Database(dbFile);

  // Apply migrations directly to the same file
  const migrationDir = path.join(process.cwd(), "prisma/migrations");
  fs.readdirSync(migrationDir)
    .sort()
    .forEach((m) => {
      const sqlPath = path.join(migrationDir, m, "migration.sql");
      if (fs.existsSync(sqlPath)) db.exec(fs.readFileSync(sqlPath, "utf-8"));
    });

  db.close();

  const adapter = new PrismaBetterSqlite3({ url: dbFile });
  const prisma = new PrismaClient({ adapter });

  const cleanup = () => {
    try { fs.unlinkSync(dbFile); } catch { /* ignore */ }
  };

  return { prisma, cleanup };
}
