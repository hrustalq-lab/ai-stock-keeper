-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_invoice_id_line_number_key" ON "invoice_line_items"("invoice_id", "line_number");
