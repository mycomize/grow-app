import type { Config } from 'drizzle-kit';

export default {
    schema: './db/schema/auth.ts',
    out: './drizzle/auth',
    dialect: 'sqlite',
    driver: 'expo',
} satisfies Config;
