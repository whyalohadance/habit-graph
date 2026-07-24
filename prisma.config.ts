import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Для миграций Prisma использует non-pooled соединение, если оно задано
    shadowDatabaseUrl:
      process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"],
  },
});
