-- ============================================================
-- Migration 020: Archive Schema for SoftOne Historical Data
-- Read-only tables for historical reports
-- ============================================================

CREATE SCHEMA IF NOT EXISTS archive;

-- SoftOne POS sales (ESTSalesTrans: 111K records, 2013-2023)
CREATE TABLE archive.softone_est_sales (
    id INTEGER PRIMARY KEY,
    sale_date TIMESTAMPTZ,
    table_id INTEGER,
    customer_id INTEGER,
    salesman_id INTEGER,
    total NUMERIC(12,2),
    net NUMERIC(12,2),
    vat NUMERIC(12,2),
    paid NUMERIC(12,2),
    section_name TEXT,
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- SoftOne POS product lines (ESTProductTrans: 1.1M records)
CREATE TABLE archive.softone_est_product_trans (
    id INTEGER PRIMARY KEY,
    sales_trans_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    quantity NUMERIC(12,4),
    unit_price NUMERIC(12,4),
    total_price NUMERIC(12,2),
    total_net NUMERIC(12,2),
    total_vat NUMERIC(12,2),
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- SoftOne invoices (CustomerSalesTrans: 605K records)
CREATE TABLE archive.softone_invoices (
    id INTEGER PRIMARY KEY,
    invoice_date DATE,
    customer_id INTEGER,
    customer_name TEXT,
    para_type TEXT,
    total NUMERIC(12,2),
    net NUMERIC(12,2),
    vat NUMERIC(12,2),
    remarks TEXT,
    imported_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for reporting
CREATE INDEX idx_archive_sales_date ON archive.softone_est_sales(sale_date);
CREATE INDEX idx_archive_product_trans_sales ON archive.softone_est_product_trans(sales_trans_id);
CREATE INDEX idx_archive_invoices_date ON archive.softone_invoices(invoice_date);
CREATE INDEX idx_archive_invoices_customer ON archive.softone_invoices(customer_id);

-- Grant read-only access
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO authenticated;
