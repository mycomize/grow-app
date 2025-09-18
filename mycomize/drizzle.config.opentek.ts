import type { Config } from 'drizzle-kit';

export default {
    schema: './db/schema/opentek.ts',
    out: './drizzle/opentek',
    dialect: 'sqlite',
    driver: 'expo',
} satisfies Config;
