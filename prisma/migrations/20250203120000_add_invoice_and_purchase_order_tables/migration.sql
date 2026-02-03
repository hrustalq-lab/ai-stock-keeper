-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" VARCHAR(50) NOT NULL,
    "supplier" VARCHAR(255) NOT NULL,
    "warehouse" VARCHAR(50) NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "expected_date" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL,
    "total_amount" DECIMAL(12,2),
    "one_c_document_id" VARCHAR(100),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "ordered_qty" INTEGER NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "invoice_type" VARCHAR(20) NOT NULL,
    "supplier" VARCHAR(255) NOT NULL,
    "warehouse" VARCHAR(50) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" VARCHAR(20) NOT NULL,
    "processing_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "ocr_method" VARCHAR(20),
    "ocr_confidence" DECIMAL(5,2),
    "total_amount" DECIMAL(12,2),
    "total_vat" DECIMAL(12,2),
    "matched_po_id" INTEGER,
    "has_discrepancies" BOOLEAN NOT NULL DEFAULT false,
    "document_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "line_number" INTEGER NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "vat_amount" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "original_sku" VARCHAR(50),
    "original_qty" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "expected_qty" INTEGER,
    "qty_discrepancy" INTEGER,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders"("supplier");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_sku_idx" ON "purchase_order_items"("sku");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_supplier_idx" ON "invoices"("supplier");

-- CreateIndex
CREATE INDEX "invoices_processing_status_idx" ON "invoices"("processing_status");

-- CreateIndex
CREATE INDEX "invoices_matched_po_id_idx" ON "invoices"("matched_po_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_sku_idx" ON "invoice_line_items"("sku");

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_matched_po_id_fkey" FOREIGN KEY ("matched_po_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "documents_1c" ADD COLUMN "invoice_id" INTEGER;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "invoice_line_item_id" INTEGER,
ADD COLUMN "one_c_line_document_id" VARCHAR(100);

-- CreateIndex
CREATE INDEX "documents_1c_invoice_id_idx" ON "documents_1c"("invoice_id");

-- CreateIndex
CREATE INDEX "transactions_invoice_line_item_id_idx" ON "transactions"("invoice_line_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_one_c_line_document_id_key" ON "transactions"("one_c_line_document_id");

-- AddForeignKey
ALTER TABLE "documents_1c" ADD CONSTRAINT "documents_1c_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_line_item_id_fkey" FOREIGN KEY ("invoice_line_item_id") REFERENCES "invoice_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
