import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Simple test table to verify encryption works
export const testTable = sqliteTable('test_data', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  encrypted_data: text('encrypted_data'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
});

// Export all tables for drizzle
export const schema = {
  testTable,
};
