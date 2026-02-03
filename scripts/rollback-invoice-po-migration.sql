-- Rollback script for migration: 20250203120000_add_invoice_and_purchase_order_tables
-- Use only when reverting the invoice/purchase order schema. Run against the target DB (e.g. psql $DATABASE_URL -f scripts/rollback-invoice-po-migration.sql).
-- Create a database backup before running in production.

-- Remove foreign keys first (from extended tables)
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_invoice_line_item_id_fkey";
ALTER TABLE "documents_1c" DROP CONSTRAINT IF EXISTS "documents_1c_invoice_id_fkey";

-- Drop new columns from existing tables
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "invoice_line_item_id";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "one_c_line_document_id";
ALTER TABLE "documents_1c" DROP COLUMN IF EXISTS "invoice_id";

-- Drop new tables (reverse dependency order: children before parents)
DROP TABLE IF EXISTS "invoice_line_items";
DROP TABLE IF EXISTS "invoices";
DROP TABLE IF EXISTS "purchase_order_items";
DROP TABLE IF EXISTS "purchase_orders";
