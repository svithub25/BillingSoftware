-- Main table for both Credit and Debit Notes
CREATE TABLE IF NOT EXISTS credit_debit_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_number TEXT  NOT NULL,
    note_type TEXT NOT NULL CHECK(note_type IN ('credit', 'debit')),
    
    -- Reference to original transaction
    reference_type TEXT NOT NULL CHECK(reference_type IN ('sale', 'purchase')),
    sale_id INTEGER DEFAULT NULL,
    purchase_id INTEGER DEFAULT NULL,
    original_invoice_number TEXT,
    original_invoice_date DATE,
    
    -- Party details (Customer for Credit Note, Supplier for Debit Note)
    party_name TEXT NOT NULL,
    party_contact TEXT,
    party_address TEXT,
    party_gstin TEXT,
    party_state TEXT,
    party_city TEXT,
    
    -- Note details
    note_date DATE NOT NULL,
    reason TEXT NOT NULL,
    reason_code TEXT null,
    
    -- Financial details
    subtotal REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    cgst_total REAL DEFAULT 0,
    sgst_total REAL DEFAULT 0,
    igst_total REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    rounding_off REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    
    -- Settlement status
    is_settled INTEGER DEFAULT 0,
    settlement_method TEXT ,
    settlement_date DATE,
    settlement_reference TEXT,
    
    -- Approval & status
    is_approved INTEGER DEFAULT 0,
    approved_by TEXT,
    approved_at DATETIME,
    remarks TEXT,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (purchase_id) REFERENCES purchases (id)
);

-- Line items for Credit/Debit Notes
CREATE TABLE IF NOT EXISTS credit_debit_note_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    
    -- Original transaction reference
    original_sale_item_id INTEGER DEFAULT NULL,
    original_purchase_item_id INTEGER DEFAULT NULL,
    
    -- Item details
    item_name TEXT NOT NULL,
    hsn_code TEXT,
    
    -- Quantities
    original_quantity REAL NOT NULL,
    return_quantity REAL NOT NULL,
    
    -- Pricing
    unit_price REAL NOT NULL,
    discount REAL DEFAULT 0,
    taxable_amount REAL NOT NULL,
    
    -- GST breakdown
    gst_percentage REAL NOT NULL DEFAULT 0,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    igst_amount REAL NOT NULL DEFAULT 0,
    
    total_amount REAL NOT NULL,
    
    -- Item condition for returns
    item_condition TEXT ,
    
    remarks TEXT,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (note_id) REFERENCES credit_debit_notes (id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items (id),
    FOREIGN KEY (original_sale_item_id) REFERENCES sale_items (id),
    FOREIGN KEY (original_purchase_item_id) REFERENCES purchase_items (id)
);

-- Stock adjustments tracking (for inventory management)
CREATE TABLE IF NOT EXISTS note_stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_item_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add', 'subtract')),
    quantity REAL NOT NULL,
    previous_stock REAL NOT NULL,
    new_stock REAL NOT NULL,
    adjustment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    
    FOREIGN KEY (note_item_id) REFERENCES credit_debit_note_items (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
);

-- Link Credit/Debit Notes to payment/financial adjustments
CREATE TABLE IF NOT EXISTS note_financial_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    adjustment_type TEXT NULL ,
    amount REAL NOT NULL,
    
    -- Payment details if applicable
    payment_method TEXT,
    transaction_reference TEXT,
    transaction_date DATE,
    
    -- If adjusted against another invoice
    adjusted_sale_id INTEGER DEFAULT NULL,
    adjusted_purchase_id INTEGER DEFAULT NULL,
    
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (note_id) REFERENCES credit_debit_notes (id) ON DELETE CASCADE,
    FOREIGN KEY (adjusted_sale_id) REFERENCES sales (id),
    FOREIGN KEY (adjusted_purchase_id) REFERENCES purchases (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cdn_note_number ON credit_debit_notes(note_number);
CREATE INDEX IF NOT EXISTS idx_cdn_note_type ON credit_debit_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_cdn_note_date ON credit_debit_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_cdn_reference_type ON credit_debit_notes(reference_type);
CREATE INDEX IF NOT EXISTS idx_cdn_sale_id ON credit_debit_notes(sale_id);
CREATE INDEX IF NOT EXISTS idx_cdn_purchase_id ON credit_debit_notes(purchase_id);
CREATE INDEX IF NOT EXISTS idx_cdn_party_name ON credit_debit_notes(party_name);
CREATE INDEX IF NOT EXISTS idx_cdn_status ON credit_debit_notes(status_code);
CREATE INDEX IF NOT EXISTS idx_cdn_settled ON credit_debit_notes(is_settled);
CREATE INDEX IF NOT EXISTS idx_cdn_approved ON credit_debit_notes(is_approved);
CREATE INDEX IF NOT EXISTS idx_cdn_date_type ON credit_debit_notes(note_date, note_type);
 
CREATE INDEX IF NOT EXISTS idx_cdni_note_id ON credit_debit_note_items(note_id);
CREATE INDEX IF NOT EXISTS idx_cdni_item_id ON credit_debit_note_items(item_id);
CREATE INDEX IF NOT EXISTS idx_cdni_original_sale ON credit_debit_note_items(original_sale_item_id);
CREATE INDEX IF NOT EXISTS idx_cdni_original_purchase ON credit_debit_note_items(original_purchase_item_id);
CREATE INDEX IF NOT EXISTS idx_cdni_status ON credit_debit_note_items(status_code);
 
CREATE INDEX IF NOT EXISTS idx_nsa_note_item ON note_stock_adjustments(note_item_id);
CREATE INDEX IF NOT EXISTS idx_nsa_item_id ON note_stock_adjustments(item_id);
CREATE INDEX IF NOT EXISTS idx_nsa_date ON note_stock_adjustments(adjustment_date);
 
CREATE INDEX IF NOT EXISTS idx_nfa_note_id ON note_financial_adjustments(note_id);
CREATE INDEX IF NOT EXISTS idx_nfa_type ON note_financial_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_nfa_date ON note_financial_adjustments(transaction_date);
CREATE INDEX IF NOT EXISTS idx_nfa_adjusted_sale ON note_financial_adjustments(adjusted_sale_id);
CREATE INDEX IF NOT EXISTS idx_nfa_adjusted_purchase ON note_financial_adjustments(adjusted_purchase_id);