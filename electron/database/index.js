import Database from "better-sqlite3";
import { runMigrations } from "./migrations.js";

export function initDatabase(dbPath) {
  const db = new Database(dbPath);

  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT  NOT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );



  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT ,
    hsn_code TEXT,
    description TEXT,
    unit TEXT DEFAULT 'pcs',
    mrp REAL DEFAULT 0,
    purchase_rate REAL DEFAULT 0,
    sale_rate REAL DEFAULT 0,
    gst_percentage REAL DEFAULT 0,
    category_id INTEGER DEFAULT NULL,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 10,
    last_supplier_id INTEGER DEFAULT NULL,
    last_contact_id INTEGER DEFAULT NULL,
    last_purchase_date DATETIME DEFAULT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER DEFAULT NULL,
    contact_id INTEGER DEFAULT NULL,
    invoice_number TEXT,
    purchase_date DATE NOT NULL,
    total_amount REAL DEFAULT 0,
    cgst_total REAL DEFAULT 0,
    sgst_total REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    is_paid INTEGER DEFAULT 0,
    payment_method TEXT,
    rounding_off REAL DEFAULT 0,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id)
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    gst_percentage REAL NOT NULL DEFAULT 0,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    discount REAL DEFAULT 0,
    total_price REAL NOT NULL,
    status_code INTEGER DEFAULT 0,
    FOREIGN KEY (purchase_id) REFERENCES purchases (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_number TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    customer_contact TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    contact_id INTEGER DEFAULT NULL,
    salesman_id INTEGER DEFAULT NULL,
    sale_type TEXT DEFAULT 'customer',
    sale_date DATE NOT NULL,
    discount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    rounding_off REAL DEFAULT 0,
    cgst_total REAL DEFAULT 0,
    sgst_total REAL DEFAULT 0,
    is_paid INTEGER DEFAULT 0,

    is_approved INTEGER DEFAULT 0,
    payment_method TEXT,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts (id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    gst_percentage REAL NOT NULL DEFAULT 0,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL,
    sale_type TEXT DEFAULT 'customer',
    status_code INTEGER DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    status_code INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS gst_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rate REAL  NOT NULL,
    description TEXT,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );


  CREATE TABLE IF NOT EXISTS salesman (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_info TEXT,
  address TEXT,
  joining_date DATE,
  status_code INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

   CREATE TABLE IF NOT EXISTS license (
    machine_id TEXT PRIMARY KEY,
    activated_on DATETIME DEFAULT CURRENT_TIMESTAMP
  );




CREATE TABLE IF NOT EXISTS closing_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  closing_date TEXT,
  closing_qty REAL,
  purchase_rate REAL,
  closing_amount REAL,
  FOREIGN KEY(item_id) REFERENCES items(id)
);


  CREATE TABLE IF NOT EXISTS bill_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    status_code INTEGER DEFAULT 0,
    is_print INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
   

CREATE TABLE IF NOT EXISTS sale_item_cost_allocation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_item_id INTEGER NOT NULL,
  purchase_item_id INTEGER NOT NULL,
  quantity_allocated REAL NOT NULL,
  purchase_rate REAL NOT NULL,
  cost_amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_item_id) REFERENCES sale_items (id),
  FOREIGN KEY (purchase_item_id) REFERENCES purchase_items (id)
);

 CREATE TABLE IF NOT EXISTS opening_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    financial_year TEXT NOT NULL,
    opening_qty REAL NOT NULL,
    opening_rate REAL NOT NULL,
    opening_amount REAL NOT NULL,
    opening_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id),
    UNIQUE(item_id, financial_year)
  );

  `);

  const defaultUser = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get("admin");
  if (!defaultUser) {
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(
      "admin",
      "admin"
    );
  }

  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
    "last_backup",
    new Date().toISOString()
  );
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
    "bill_counter",
    "0"
  );
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
    "gst_on_sale",
    "0"
  );
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(
    "gst_on_purchase",
    "0"
  );
  // Add to your database initialization:
  db.exec(`
  -- Bank Accounts Master
  CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    ifsc_code TEXT,
    account_type TEXT CHECK(account_type IN ('Savings', 'Current', 'Cash Credit', 'Overdraft')) DEFAULT 'Current',
    opening_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status_code INTEGER DEFAULT 0
  );

  -- Bank Reconciliation
  CREATE TABLE IF NOT EXISTS bank_reconciliation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_account_id INTEGER NOT NULL,
    statement_date DATE NOT NULL,
    statement_balance REAL NOT NULL,
    book_balance REAL NOT NULL,
    difference REAL NOT NULL,
    reconciled_by TEXT,
    reconciled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id)
  );

  -- Post Dated Cheques
  CREATE TABLE IF NOT EXISTS post_dated_cheques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    cheque_number TEXT NOT NULL,
    cheque_date DATE NOT NULL,
    amount REAL NOT NULL,
    party_name TEXT NOT NULL,
    bank_name TEXT,
    status TEXT CHECK(status IN ('Pending', 'Deposited', 'Cleared', 'Bounced', 'Cancelled')) DEFAULT 'Pending',
    deposit_date DATE,
    cleared_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id)
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- UNIFIED ACCOUNTING TABLES
  -- ============================================================

  -- 1. The 4 root nodes for Balance Sheet and P&L
  CREATE TABLE IF NOT EXISTS master_accounts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL UNIQUE,
    type        TEXT NOT NULL CHECK(type IN ('liabilities', 'assets', 'income', 'expenses')),
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. Tally-style account groups (Chart of Accounts)
  CREATE TABLE IF NOT EXISTS account_groups (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    master_account_id INTEGER NOT NULL,
    parent_group_id  INTEGER DEFAULT NULL,
    description      TEXT,
    is_primary       INTEGER NOT NULL DEFAULT 0,
    is_active        INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_account_id) REFERENCES master_accounts(id),
    FOREIGN KEY (parent_group_id)   REFERENCES account_groups(id)
  );

  -- 3. Unified Contacts Table (replaces customer + suppliers)
  CREATE TABLE IF NOT EXISTS contacts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    account_group_id INTEGER,
    name             TEXT NOT NULL,
    contact_person   TEXT,
    email            TEXT,
    phone            TEXT,
    gstin            TEXT,
    gst_treatment    TEXT DEFAULT 'registered',
    state            TEXT DEFAULT 'Maharashtra',
    city             TEXT,
    country          TEXT DEFAULT 'India',
    address          TEXT,
    pincode          TEXT,
    payment_terms    INTEGER DEFAULT 15,
    credit_limit     REAL DEFAULT 0,
    credit_days      INTEGER DEFAULT 0,
    opening_balance  REAL DEFAULT 0,
    current_balance  REAL DEFAULT 0,
    notes            TEXT,
    is_active        INTEGER DEFAULT 1,
    is_deleted       INTEGER DEFAULT 0,
    created_at       TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at       TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_group_id) REFERENCES account_groups(id)
  );

  -- 4. Transactions (The Journal / Vouchers)
  CREATE TABLE IF NOT EXISTS transactions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_date TEXT NOT NULL,
    voucher_type     TEXT NOT NULL CHECK(voucher_type IN ('receipt', 'payment', 'sales', 'purchase', 'journal', 'contra')),
    voucher_no       TEXT NOT NULL,
    reference_no     TEXT,
    notes            TEXT,
    contact_id       INTEGER,
    bank_account_id  INTEGER,
    amount           REAL DEFAULT 0,
    cheque_number    TEXT,
    cheque_date      TEXT,
    cleared_status   TEXT DEFAULT 'Pending',
    cleared_date     TEXT,
    reconciled       INTEGER DEFAULT 0,
    reconciled_date  TEXT,
    is_deleted       INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id),
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
  );

  -- 5. Transaction Lines (The Double-Entry Legs)
  CREATE TABLE IF NOT EXISTS transaction_lines (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id   INTEGER NOT NULL,
    ledger_type      TEXT NOT NULL CHECK(ledger_type IN ('contact', 'bank_account', 'account_group')),
    ledger_id        INTEGER NOT NULL,
    debit            REAL NOT NULL DEFAULT 0,
    credit           REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );

  -- Indexes for banking
  CREATE INDEX IF NOT EXISTS idx_pdc_status ON post_dated_cheques(status);
  CREATE INDEX IF NOT EXISTS idx_pdc_date ON post_dated_cheques(cheque_date);

  -- Indexes for unified accounting
  CREATE INDEX IF NOT EXISTS idx_contacts_account_group ON contacts(account_group_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
  CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
  CREATE INDEX IF NOT EXISTS idx_contacts_gstin ON contacts(gstin);
  CREATE INDEX IF NOT EXISTS idx_contacts_active ON contacts(is_active, is_deleted);

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
  CREATE INDEX IF NOT EXISTS idx_transactions_voucher_type ON transactions(voucher_type);
  CREATE INDEX IF NOT EXISTS idx_transactions_voucher_no ON transactions(voucher_no);
  CREATE INDEX IF NOT EXISTS idx_transactions_contact ON transactions(contact_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted);

  CREATE INDEX IF NOT EXISTS idx_transaction_lines_txn ON transaction_lines(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_transaction_lines_ledger ON transaction_lines(ledger_type, ledger_id);

  CREATE INDEX IF NOT EXISTS idx_account_groups_master ON account_groups(master_account_id);
  CREATE INDEX IF NOT EXISTS idx_account_groups_parent ON account_groups(parent_group_id);
`);

  // Seed master accounts and account groups
  db.exec(`
    INSERT OR IGNORE INTO master_accounts (id, name, type, description) VALUES
    (1, 'Capital & Liabilities', 'liabilities', 'Balance Sheet — right side.'),
    (2, 'Assets',                'assets',      'Balance Sheet — left side.'),
    (3, 'Income',                'income',      'Profit & Loss — credit side.'),
    (4, 'Expenses',              'expenses',    'Profit & Loss — debit side.');

    INSERT OR IGNORE INTO account_groups (id, name, master_account_id, parent_group_id, description, is_primary) VALUES
    (1,  'Capital Account',            1, NULL, 'Owner capital, partners capital and reserves',               1),
    (2,  'Reserves & Surplus',         1, NULL, 'Retained earnings and other reserves',                      1),
    (3,  'Loans (Liability)',          1, NULL, 'Long-term borrowings and secured/unsecured loans',           1),
    (4,  'Current Liabilities',        1, NULL, 'Short-term obligations due within one year',                1),
    (5,  'Sundry Creditors',           1, 4,    'Accounts payable — vendors and suppliers',                  1),
    (6,  'Duties & Taxes',             1, 4,    'GST payable, TDS payable and other statutory dues',         1),
    (7,  'Provisions',                 1, 4,    'Provisions for expenses and other liabilities',              1),
    (8,  'Fixed Assets',               2, NULL, 'Tangible assets: computers, furniture, equipment',          1),
    (9,  'Investments',                2, NULL, 'Long-term financial investments',                            1),
    (10, 'Current Assets',             2, NULL, 'Assets expected to be converted to cash within one year',   1),
    (11, 'Bank Accounts',              2, 10,   'All bank and digital wallet accounts',                      1),
    (12, 'Cash-in-Hand',               2, 10,   'Petty cash and physical cash balances',                     1),
    (13, 'Sundry Debtors',             2, 10,   'Accounts receivable — customers who owe money',             1),
    (14, 'Loans & Advances (Assets)',  2, 10,   'Advance payments, staff loans and security deposits',       1),
    (15, 'Stock-in-Hand',              2, 10,   'Inventory and consumable stock',                             1),
    (16, 'Misc. Expenses (Assets)',    2, NULL, 'Deferred and prepaid expenses',                              1),
    (17, 'Sales Accounts',             3, NULL, 'Primary revenue from sale of services or products',         1),
    (18, 'Direct Income',              3, NULL, 'Income directly related to core business activity',          1),
    (19, 'Indirect Income',            3, NULL, 'Other income: interest received, discounts earned, misc.',  1),
    (20, 'Purchase Accounts',          4, NULL, 'Cost of goods or services purchased for resale',            1),
    (21, 'Direct Expenses',            4, NULL, 'Expenses directly related to service delivery / COGS',      1),
    (22, 'Indirect Expenses',          4, NULL, 'Overheads: rent, salaries, admin, utilities, hosting',      1);
  `);
  //opening stock
  db.exec(`
   -- Enhanced opening stock table (already exists, but ensure it has all needed columns)
  CREATE TABLE IF NOT EXISTS opening_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    financial_year TEXT NOT NULL,
    opening_qty REAL NOT NULL,
    opening_rate REAL NOT NULL,
    opening_amount REAL NOT NULL,
    opening_date DATE NOT NULL,
    is_locked INTEGER DEFAULT 0,  -- NEW: Prevent tampering
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id),
    UNIQUE(item_id, financial_year)
  );

  -- Create index for faster queries
  CREATE INDEX IF NOT EXISTS idx_opening_stock_item_fy 
  ON opening_stock(item_id, financial_year);
`);

  // ============================================
  // CREATE INDEXES FOR PERFORMANCE OPTIMIZATION
  // ============================================
  db.exec(`
    -- Users table indexes
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status_code);

    -- Categories table indexes
    CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status_code);

    -- Items table indexes (CRITICAL for inventory queries)
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
    CREATE INDEX IF NOT EXISTS idx_items_hsn_code ON items(hsn_code);
    CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status_code);
    CREATE INDEX IF NOT EXISTS idx_items_current_stock ON items(current_stock);
    CREATE INDEX IF NOT EXISTS idx_items_low_stock ON items(current_stock, minimum_stock);

    -- Purchases table indexes
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON purchases(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status_code);
    CREATE INDEX IF NOT EXISTS idx_purchases_payment ON purchases(is_paid);

    -- Purchase Items table indexes
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_item_id ON purchase_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_status ON purchase_items(status_code);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_composite ON purchase_items(purchase_id, item_id);

    -- Sales table indexes (CRITICAL for billing and reports)
    CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
    CREATE INDEX IF NOT EXISTS idx_sales_salesman_id ON sales(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status_code);
    CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(is_paid);
    CREATE INDEX IF NOT EXISTS idx_sales_approval ON sales(is_approved);
    CREATE INDEX IF NOT EXISTS idx_sales_date_salesman ON sales(sale_date, salesman_id);

    -- Sale Items table indexes (CRITICAL for analytics)
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_status ON sale_items(status_code);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_type ON sale_items(sale_type);
    CREATE INDEX IF NOT EXISTS idx_sale_items_composite ON sale_items(sale_id, item_id);

    -- Salesman table indexes
    CREATE INDEX IF NOT EXISTS idx_salesman_name ON salesman(name);
    CREATE INDEX IF NOT EXISTS idx_salesman_contact ON salesman(contact_info);
    CREATE INDEX IF NOT EXISTS idx_salesman_status ON salesman(status_code);

    -- Closing Stock indexes
    CREATE INDEX IF NOT EXISTS idx_closing_stock_item ON closing_stock(item_id);
    CREATE INDEX IF NOT EXISTS idx_closing_stock_date ON closing_stock(closing_date);
    CREATE INDEX IF NOT EXISTS idx_closing_stock_composite ON closing_stock(item_id, closing_date);

    -- Opening Stock indexes
    CREATE INDEX IF NOT EXISTS idx_opening_stock_item_fy ON opening_stock(item_id, financial_year);
    CREATE INDEX IF NOT EXISTS idx_opening_stock_fy ON opening_stock(financial_year);
    CREATE INDEX IF NOT EXISTS idx_opening_stock_date ON opening_stock(opening_date);

    -- Sale Item Cost Allocation indexes
    CREATE INDEX IF NOT EXISTS idx_cost_allocation_sale ON sale_item_cost_allocation(sale_item_id);
    CREATE INDEX IF NOT EXISTS idx_cost_allocation_purchase ON sale_item_cost_allocation(purchase_item_id);

    -- Settings indexes
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

    -- Banking indexes
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_name ON bank_accounts(account_name);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON bank_accounts(account_number);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(account_type);

    CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_account ON bank_reconciliation(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_date ON bank_reconciliation(statement_date);

    CREATE INDEX IF NOT EXISTS idx_pdc_transaction ON post_dated_cheques(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_pdc_party ON post_dated_cheques(party_name);
    CREATE INDEX IF NOT EXISTS idx_pdc_cheque_number ON post_dated_cheques(cheque_number);
    CREATE INDEX IF NOT EXISTS idx_pdc_status_date ON post_dated_cheques(status, cheque_date);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    purchase_item_id INTEGER NOT NULL,
    batch_number TEXT NOT NULL,
    mfg_date DATE,
    exp_date DATE,
    qty_received REAL NOT NULL,
    qty_available REAL NOT NULL,
    purchase_rate REAL NOT NULL,
    mrp REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id)
);
`);
  db.exec(`-- Main table for both Credit and Debit Notes
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
CREATE INDEX IF NOT EXISTS idx_nfa_adjusted_purchase ON note_financial_adjustments(adjusted_purchase_id);`);
  db.exec(`
  CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    company_name TEXT NOT NULL DEFAULT 'Your Company Name',
    tagline TEXT DEFAULT null,
    address_line1 TEXT DEFAULT null,
    address_line2 TEXT DEFAULT null,
    city TEXT DEFAULT null,
    state TEXT DEFAULT null,
    pincode TEXT DEFAULT null,
    country TEXT DEFAULT null,
    phone TEXT DEFAULT null,
    mobile TEXT DEFAULT null,
    email TEXT DEFAULT null,
    website TEXT DEFAULT null,
    gstin TEXT DEFAULT '',
    pan TEXT DEFAULT '',
    cin TEXT DEFAULT '',
    logo_path TEXT DEFAULT '',
    footer_text TEXT DEFAULT 'Thank you for your business!',
    bank_name TEXT DEFAULT '',
    bank_account_number TEXT DEFAULT '',
    bank_ifsc TEXT DEFAULT '',
    bank_branch TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    edit_pin TEXT NULL,
    terms_1 TEXT DEFAULT '',
    terms_2 TEXT DEFAULT '',
    terms_3 TEXT DEFAULT '',
    terms_4 TEXT DEFAULT '',
    terms_5 TEXT DEFAULT '',
    is_locked INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default company info
  INSERT OR IGNORE INTO company_info (
    id, company_name,
    footer_text
  ) VALUES (
    1, 
    'Company Name', 
    'Thank you for your business! Visit us again.'
  );

  CREATE INDEX IF NOT EXISTS idx_company_info_id ON company_info(id);
`);

  // ============================================
  // GODOWNS/BRANCHES AND STOCK MOVEMENTS
  // ============================================
  db.exec(`
    -- Godowns/Branches Master Table
    CREATE TABLE IF NOT EXISTS godowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      location_type TEXT CHECK(location_type IN ('godown', 'branch', 'warehouse', 'shop', 'other')) DEFAULT 'godown',
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      contact_person TEXT,
      contact_number TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      remarks TEXT,
      status_code INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock Movements (Transfers, Adjustments, etc.)
    CREATE TABLE IF NOT EXISTS stock_movements (
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

      -- Source and Destination
      from_location_type TEXT CHECK(from_location_type IN ('godown', 'branch', 'party', 'none')),
      from_location_id INTEGER,
      from_godown_id INTEGER,

      to_location_type TEXT CHECK(to_location_type IN ('godown', 'branch', 'party', 'none')),
      to_location_id INTEGER,
      to_godown_id INTEGER,

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
      reference_doc_type TEXT,
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

    -- Stock Movement Items
    CREATE TABLE IF NOT EXISTS stock_movement_items (
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
      serial_numbers TEXT,
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

      FOREIGN KEY (movement_id) REFERENCES stock_movements (id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items (id)
    );

    -- Movement Acknowledgments
    CREATE TABLE IF NOT EXISTS movement_acknowledgments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movement_id INTEGER NOT NULL,

      acknowledgment_stage TEXT CHECK(acknowledgment_stage IN (
        'dispatch', 'receipt', 'quality_check', 'approval'
      )) NOT NULL,

      acknowledged_by_name TEXT NOT NULL,
      designation TEXT,
      signature_data TEXT,
      acknowledgment_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,

      remarks TEXT,

      FOREIGN KEY (movement_id) REFERENCES stock_movements (id) ON DELETE CASCADE
    );

    -- Item Location Stock (Track stock per godown/branch)
    CREATE TABLE IF NOT EXISTS item_location_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      godown_id INTEGER NOT NULL,
      current_stock REAL DEFAULT 0,
      reserved_stock REAL DEFAULT 0,
      available_stock REAL DEFAULT 0,
      last_movement_date DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (item_id) REFERENCES items (id),
      FOREIGN KEY (godown_id) REFERENCES godowns (id),
      UNIQUE(item_id, godown_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_godowns_name ON godowns(name);
    CREATE INDEX IF NOT EXISTS idx_godowns_code ON godowns(code);
    CREATE INDEX IF NOT EXISTS idx_godowns_type ON godowns(location_type);
    CREATE INDEX IF NOT EXISTS idx_godowns_active ON godowns(is_active);

    CREATE INDEX IF NOT EXISTS idx_movements_number ON stock_movements(movement_number);
    CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(movement_date);
    CREATE INDEX IF NOT EXISTS idx_movements_category ON stock_movements(movement_category);
    CREATE INDEX IF NOT EXISTS idx_movements_status ON stock_movements(movement_status);
    CREATE INDEX IF NOT EXISTS idx_movements_from_godown ON stock_movements(from_godown_id);
    CREATE INDEX IF NOT EXISTS idx_movements_to_godown ON stock_movements(to_godown_id);
    CREATE INDEX IF NOT EXISTS idx_movements_reference ON stock_movements(reference_doc_type, reference_doc_id);

    CREATE INDEX IF NOT EXISTS idx_movement_items_movement ON stock_movement_items(movement_id);
    CREATE INDEX IF NOT EXISTS idx_movement_items_item ON stock_movement_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_movement_items_batch ON stock_movement_items(batch_number);

    CREATE INDEX IF NOT EXISTS idx_location_stock_item ON item_location_stock(item_id);
    CREATE INDEX IF NOT EXISTS idx_location_stock_godown ON item_location_stock(godown_id);
    CREATE INDEX IF NOT EXISTS idx_location_stock_composite ON item_location_stock(item_id, godown_id);
  `);

  // Insert default main godown
  const defaultGodown = db
    .prepare("SELECT * FROM godowns WHERE is_default = 1")
    .get();
  if (!defaultGodown) {
    db.prepare(
      `INSERT INTO godowns (name, code, location_type, is_active, is_default, remarks)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      "Main Warehouse",
      "MAIN-001",
      "warehouse",
      1,
      1,
      "Default main warehouse location"
    );
  }

  const defaultCashAccount = db
    .prepare("SELECT * FROM bank_accounts WHERE account_name = ?")
    .get("Cash");
  if (!defaultCashAccount) {
    db.prepare(
      `
    INSERT INTO bank_accounts 
    (account_name, account_number, bank_name, branch_name, ifsc_code, account_type, opening_balance, current_balance, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    ).run(
      "Cash", // account_name
      "CASH-001", // account_number
      "Cash in Hand", // bank_name
      "N/A", // branch_name
      "N/A", // ifsc_code
      "Current", // account_type
      0, // opening_balance
      0, // current_balance
      1 // is_active
    );
  }

  try {
    runMigrations(db);
  } catch (error) {
    console.error(" Migration error:", error);
  }

  return db;
}
