// Prisma Configuration
// Примечание: dotenv не требуется - Next.js и Docker автоматически загружают env переменные
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
