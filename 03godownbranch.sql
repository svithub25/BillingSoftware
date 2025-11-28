-- Unified Stock Movements (Transfers, Adjustments, etc.)
CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Document identification
    movement_number TEXT UNIQUE NOT NULL,
    movement_date DATE NOT NULL,
    
    -- Movement type
    movement_category TEXT CHECK(movement_category IN (
        'transfer',           -- godown to godown
        'branch_transfer',    -- branch to branch
        'adjustment_in',      -- stock increase (found, reconciliation)
        'adjustment_out',     -- stock decrease (damage, theft, write-off)
        'return_in',          -- goods returned by customer
        'return_out',         -- goods returned to supplier
        'production_in',      -- manufactured goods
        'production_out',     -- raw material consumption
        'sample_out',         -- free samples given
        'opening_balance'     -- opening stock entry
    )) NOT NULL,
    
    -- Source and Destination (NULL if not applicable)
    from_location_type TEXT CHECK(from_location_type IN ('godown', 'branch', 'party', 'none')),
    from_location_id INTEGER,
    from_godown_id INTEGER,
    from_branch_id INTEGER,
    
    to_location_type TEXT CHECK(to_location_type IN ('godown', 'branch', 'party', 'none')),
    to_location_id INTEGER,
    to_godown_id INTEGER,
    to_branch_id INTEGER,
    
    -- Status workflow
    movement_status TEXT CHECK(movement_status IN (
        'draft',
        'pending_approval',
        'approved',
        'in_transit',
        'partially_received',
        'completed',
        'cancelled'
    )) DEFAULT 'draft',
    
    -- Dates
    dispatch_date DATE,
    expected_date DATE,
    received_date DATE,
    
    -- Transport details (for transfers)
    transport_mode TEXT,
    vehicle_number TEXT,
    driver_name TEXT,
    driver_contact TEXT,
    lr_number TEXT,
    transporter_name TEXT,
    freight_charges REAL DEFAULT 0,
    e_way_bill_number TEXT,
    
    -- Reference documents
    reference_doc_type TEXT, -- 'sale', 'purchase', 'credit_note', etc.
    reference_doc_id INTEGER,
    reference_doc_number TEXT,
    
    -- Party details (if applicable)
    party_type TEXT CHECK(party_type IN ('customer', 'supplier', 'none')),
    party_id INTEGER,
    party_name TEXT,
    
    -- Totals
    total_quantity REAL DEFAULT 0,
    total_value REAL DEFAULT 0,
    
    -- Personnel
    created_by INTEGER,
    approved_by INTEGER,
    dispatched_by INTEGER,
    received_by INTEGER,
    
    -- Notes
    reason TEXT,
    dispatch_notes TEXT,
    receiving_notes TEXT,
    
    is_approved INTEGER DEFAULT 0,
    approval_date DATETIME,
    
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (from_godown_id) REFERENCES godowns (id),
    FOREIGN KEY (to_godown_id) REFERENCES godowns (id),
    FOREIGN KEY (created_by) REFERENCES users (id),
    FOREIGN KEY (approved_by) REFERENCES users (id),
    FOREIGN KEY (dispatched_by) REFERENCES users (id),
    FOREIGN KEY (received_by) REFERENCES users (id)
);

-- Unified Movement Items
CREATE TABLE stock_movement_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    
    -- Quantities
    planned_quantity REAL NOT NULL,
    dispatched_quantity REAL,
    received_quantity REAL DEFAULT 0,
    accepted_quantity REAL DEFAULT 0,
    rejected_quantity REAL DEFAULT 0,
    damaged_quantity REAL DEFAULT 0,
    
    -- Batch/Serial tracking
    batch_number TEXT,
    serial_numbers TEXT, -- JSON array
    manufacturing_date DATE,
    expiry_date DATE,
    
    -- Costing
    unit_rate REAL,
    total_value REAL,
    
    -- Condition tracking
    condition_on_dispatch TEXT CHECK(condition_on_dispatch IN ('new', 'good', 'used', 'refurbished')),
    condition_on_receipt TEXT CHECK(condition_on_receipt IN ('good', 'damaged', 'partial_damage', 'not_received')),
    
    remarks TEXT,
    status_code INTEGER DEFAULT 0,
    
    FOREIGN KEY (movement_id) REFERENCES stock_movements (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
);

-- Movement Acknowledgments
CREATE TABLE movement_acknowledgments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_id INTEGER NOT NULL,
    
    acknowledgment_stage TEXT CHECK(acknowledgment_stage IN (
        'dispatch', 'receipt', 'quality_check', 'approval'
    )) NOT NULL,
    
    acknowledged_by_name TEXT NOT NULL,
    designation TEXT,
    signature_data TEXT, -- base64 or path
    acknowledgment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    remarks TEXT,
    
    FOREIGN KEY (movement_id) REFERENCES stock_movements (id)
);

-- Indexes
CREATE INDEX idx_movements_number ON stock_movements(movement_number);
CREATE INDEX idx_movements_date ON stock_movements(movement_date);
CREATE INDEX idx_movements_category ON stock_movements(movement_category);
CREATE INDEX idx_movements_status ON stock_movements(movement_status);
CREATE INDEX idx_movements_from_godown ON stock_movements(from_godown_id);
CREATE INDEX idx_movements_to_godown ON stock_movements(to_godown_id);
CREATE INDEX idx_movements_reference ON stock_movements(reference_doc_type, reference_doc_id);

CREATE INDEX idx_movement_items_movement ON stock_movement_items(movement_id);
CREATE INDEX idx_movement_items_item ON stock_movement_items(item_id);
CREATE INDEX idx_movement_items_batch ON stock_movement_items(batch_number);