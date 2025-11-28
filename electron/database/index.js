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

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    address TEXT,
    gstin TEXT,
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
    last_purchase_date DATETIME DEFAULT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (last_supplier_id) REFERENCES suppliers (id)
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
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
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS customer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    contact TEXT UNIQUE,
    address TEXT,
    gstin TEXT,
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


CREATE TABLE IF NOT EXISTS payment_verification (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER DEFAULT NULL,
  purchase_id INTEGER DEFAULT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'upi', 'neft_rtgs', 'cheque')),
  amount REAL NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales (id),
  FOREIGN KEY (purchase_id) REFERENCES purchases (id)
);

CREATE TABLE IF NOT EXISTS payment_upi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_verification_id INTEGER NOT NULL,
  transaction_id TEXT,
  upi_id TEXT,
  app_name TEXT,
  reference_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_verification_id) REFERENCES payment_verification (id)
);

CREATE TABLE IF NOT EXISTS payment_cash (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_verification_id INTEGER NOT NULL,
  denomination_notes TEXT,
  received_by TEXT,
  receipt_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_verification_id) REFERENCES payment_verification (id)
);

CREATE TABLE IF NOT EXISTS payment_neft_rtgs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_verification_id INTEGER NOT NULL,
  transaction_reference TEXT,
  sender_bank TEXT,
  sender_account TEXT,
  receiver_bank TEXT,
  receiver_account TEXT,
  transfer_type TEXT CHECK(transfer_type IN ('neft', 'rtgs')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_verification_id) REFERENCES payment_verification (id)
);

CREATE TABLE IF NOT EXISTS payment_cheque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_verification_id INTEGER NOT NULL,
  cheque_number TEXT,
  bank_name TEXT,
  branch_name TEXT,
  cheque_date DATE,
  drawer_name TEXT,
  micr_code TEXT,
  status TEXT DEFAULT 'received' CHECK(status IN ('received', 'deposited', 'cleared', 'bounced')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_verification_id) REFERENCES payment_verification (id)
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
  // Add to your database initialization:
  db.exec(`
  -- Bank Accounts Master
  CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL ,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    ifsc_code TEXT,
    account_type TEXT CHECK(account_type IN ('Savings', 'Current', 'Cash Credit', 'Overdraft')) DEFAULT 'Current',
    opening_balance REAL DEFAULT 0,
   -- opening_balance_type TEXT CHECK(opening_balance_type IN ('Debit', 'Credit')) DEFAULT 'Debit',
    current_balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status_code INTEGER DEFAULT 0
  );

  -- Bank Transactions

CREATE TABLE IF NOT EXISTS bank_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_number TEXT NOT NULL ,
  voucher_type TEXT NOT NULL CHECK(voucher_type IN ('Payment', 'Receipt', 'Contra')),
  transaction_date TEXT NOT NULL,
  bank_account_id INTEGER NOT NULL,
  party_name TEXT,
  amount REAL NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('Debit', 'Credit')),
  cheque_number TEXT,
  cheque_date TEXT,
  narration TEXT,
  cleared_status TEXT DEFAULT 'Pending' CHECK(cleared_status IN ('Pending', 'Deposited', 'Cleared', 'Bounced', 'Cancelled')),
  cleared_date TEXT,
  reconciled INTEGER DEFAULT 0,
  reconciled_date TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status_code INTEGER DEFAULT 0,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);


  -- Bank Transaction Ledger Entries (for double entry)
  CREATE TABLE IF NOT EXISTS bank_ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    ledger_type TEXT CHECK(ledger_type IN ('Bank', 'Party', 'Expense', 'Income')) NOT NULL,
    ledger_name TEXT NOT NULL,
    debit_amount REAL DEFAULT 0,
    credit_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES bank_transactions (id) ON DELETE CASCADE
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

  -- Expense/Income Categories
  CREATE TABLE IF NOT EXISTS transaction_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE,
    category_type TEXT CHECK(category_type IN ('Expense', 'Income')) NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Replace the post_dated_cheques table creation with this updated version:
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
    FOREIGN KEY (transaction_id) REFERENCES bank_transactions (id)
  );

   CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
  CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
  CREATE INDEX IF NOT EXISTS idx_bank_transactions_voucher ON bank_transactions(voucher_number);
  CREATE INDEX IF NOT EXISTS idx_pdc_status ON post_dated_cheques(status);
  CREATE INDEX IF NOT EXISTS idx_pdc_date ON post_dated_cheques(cheque_date);
`);

  // Insert default categories
  // Insert default categories
  db.exec(`
  INSERT OR IGNORE INTO transaction_categories (category_name, category_type, description, is_default) VALUES
  -- EXPENSE CATEGORIES
  ('Purchase of Goods', 'Expense', 'Purchase of trading/raw material goods', 1),
  ('Salary & Wages', 'Expense', 'Employee salaries and daily wages', 1),
  ('Rent', 'Expense', 'Office/Shop/Warehouse rent', 1),
  ('Electricity', 'Expense', 'Power and electricity bills', 1),
  ('Telephone & Internet', 'Expense', 'Communication expenses', 1),
  ('Transportation & Freight', 'Expense', 'Vehicle, fuel, and freight charges', 1),
  ('Packaging Material', 'Expense', 'Boxes, bags, and packaging supplies', 1),
  ('Loading & Unloading', 'Expense', 'Labour charges for loading/unloading', 1),
  ('Stationery & Printing', 'Expense', 'Office supplies and printing', 1),
  ('Bank Charges', 'Expense', 'Bank fees, charges, and commission', 1),
  ('Interest on Loan', 'Expense', 'Interest paid on business loans', 1),
  ('GST Payment', 'Expense', 'GST paid to government', 1),
  ('TDS Payment', 'Expense', 'TDS deducted and paid', 1),
  ('Professional Fees', 'Expense', 'CA, Legal, Consultant fees', 1),
  ('Repairs & Maintenance', 'Expense', 'Equipment and building maintenance', 1),
  ('Vehicle Maintenance', 'Expense', 'Vehicle servicing and repairs', 1),
  ('Insurance Premium', 'Expense', 'Business and vehicle insurance', 1),
  ('License & Registration', 'Expense', 'FSSAI, Trade License, GST registration', 1),
  ('Marketing & Advertising', 'Expense', 'Promotion and advertising costs', 1),
  ('Travelling & Conveyance', 'Expense', 'Business travel expenses', 1),
  ('Office Expenses', 'Expense', 'General office running expenses', 1),
  ('Security Charges', 'Expense', 'Watchman and security services', 1),
  ('Water Charges', 'Expense', 'Water supply bills', 1),
  ('Charitable Donations', 'Expense', 'Donations and CSR activities', 1),
  ('Miscellaneous Expenses', 'Expense', 'Other small expenses', 1),
  
  -- INCOME CATEGORIES
  ('Sales Revenue', 'Income', 'Revenue from sales of goods', 1),
  ('Cash Discount Received', 'Income', 'Discount received from suppliers', 1),
  ('Interest Received', 'Income', 'Interest from bank deposits/FD', 1),
  ('Commission Received', 'Income', 'Commission earned from business', 1),
  ('Scrap Sales', 'Income', 'Sale of scrap material', 1),
  ('Rental Income', 'Income', 'Income from property rent', 1),
  ('TDS Refund', 'Income', 'TDS refund received', 1),
  ('GST Refund', 'Income', 'GST refund from government', 1),
  ('Bank Interest', 'Income', 'Interest credited by bank', 1),
  ('Other Income', 'Income', 'Miscellaneous income', 1);
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

    -- Suppliers table indexes
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_suppliers_contact ON suppliers(contact);
    CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
    CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status_code);

    -- Items table indexes (CRITICAL for inventory queries)
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
    CREATE INDEX IF NOT EXISTS idx_items_hsn_code ON items(hsn_code);
    CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status_code);
    CREATE INDEX IF NOT EXISTS idx_items_current_stock ON items(current_stock);
    CREATE INDEX IF NOT EXISTS idx_items_low_stock ON items(current_stock, minimum_stock);
    CREATE INDEX IF NOT EXISTS idx_items_last_supplier ON items(last_supplier_id);

    -- Purchases table indexes
    CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON purchases(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status_code);
    CREATE INDEX IF NOT EXISTS idx_purchases_payment ON purchases(is_paid);
    CREATE INDEX IF NOT EXISTS idx_purchases_date_supplier ON purchases(purchase_date, supplier_id);

    -- Purchase Items table indexes
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_item_id ON purchase_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_status ON purchase_items(status_code);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_composite ON purchase_items(purchase_id, item_id);

    -- Sales table indexes (CRITICAL for billing and reports)
    CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
    CREATE INDEX IF NOT EXISTS idx_sales_customer_contact ON sales(customer_contact);
    CREATE INDEX IF NOT EXISTS idx_sales_salesman_id ON sales(salesman_id);
    CREATE INDEX IF NOT EXISTS idx_sales_sale_type ON sales(sale_type);
    CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status_code);
    CREATE INDEX IF NOT EXISTS idx_sales_payment ON sales(is_paid);
    CREATE INDEX IF NOT EXISTS idx_sales_approval ON sales(is_approved);
    CREATE INDEX IF NOT EXISTS idx_sales_date_customer ON sales(sale_date, customer_name);
    CREATE INDEX IF NOT EXISTS idx_sales_date_salesman ON sales(sale_date, salesman_id);

    -- Sale Items table indexes (CRITICAL for analytics)
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_status ON sale_items(status_code);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_type ON sale_items(sale_type);
    CREATE INDEX IF NOT EXISTS idx_sale_items_composite ON sale_items(sale_id, item_id);

    -- Customer table indexes
    CREATE INDEX IF NOT EXISTS idx_customer_name ON customer(name);
    CREATE INDEX IF NOT EXISTS idx_customer_contact ON customer(contact);
    CREATE INDEX IF NOT EXISTS idx_customer_gstin ON customer(gstin);
    CREATE INDEX IF NOT EXISTS idx_customer_status ON customer(status_code);

    -- Salesman table indexes
    CREATE INDEX IF NOT EXISTS idx_salesman_name ON salesman(name);
    CREATE INDEX IF NOT EXISTS idx_salesman_contact ON salesman(contact_info);
    CREATE INDEX IF NOT EXISTS idx_salesman_status ON salesman(status_code);

    -- Payment Verification indexes
    CREATE INDEX IF NOT EXISTS idx_payment_verification_sale ON payment_verification(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payment_verification_purchase ON payment_verification(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_payment_verification_date ON payment_verification(payment_date);
    CREATE INDEX IF NOT EXISTS idx_payment_verification_status ON payment_verification(status);
    CREATE INDEX IF NOT EXISTS idx_payment_verification_method ON payment_verification(payment_method);

    -- Payment UPI indexes
    CREATE INDEX IF NOT EXISTS idx_payment_upi_verification ON payment_upi(payment_verification_id);
    CREATE INDEX IF NOT EXISTS idx_payment_upi_transaction ON payment_upi(transaction_id);

    -- Payment Cash indexes
    CREATE INDEX IF NOT EXISTS idx_payment_cash_verification ON payment_cash(payment_verification_id);
    CREATE INDEX IF NOT EXISTS idx_payment_cash_receipt ON payment_cash(receipt_number);

    -- Payment NEFT/RTGS indexes
    CREATE INDEX IF NOT EXISTS idx_payment_neft_verification ON payment_neft_rtgs(payment_verification_id);
    CREATE INDEX IF NOT EXISTS idx_payment_neft_reference ON payment_neft_rtgs(transaction_reference);

    -- Payment Cheque indexes
    CREATE INDEX IF NOT EXISTS idx_payment_cheque_verification ON payment_cheque(payment_verification_id);
    CREATE INDEX IF NOT EXISTS idx_payment_cheque_number ON payment_cheque(cheque_number);
    CREATE INDEX IF NOT EXISTS idx_payment_cheque_status ON payment_cheque(status);
    CREATE INDEX IF NOT EXISTS idx_payment_cheque_date ON payment_cheque(cheque_date);

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

    -- Banking indexes (already exist, but adding more)
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_name ON bank_accounts(account_name);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_number ON bank_accounts(account_number);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(account_type);
    
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_voucher ON bank_transactions(voucher_number);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(voucher_type);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_party ON bank_transactions(party_name);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(cleared_status);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(reconciled);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_cheque ON bank_transactions(cheque_number);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_date_account ON bank_transactions(transaction_date, bank_account_id);
    
    CREATE INDEX IF NOT EXISTS idx_bank_ledger_transaction ON bank_ledger_entries(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_bank_ledger_type ON bank_ledger_entries(ledger_type);
    CREATE INDEX IF NOT EXISTS idx_bank_ledger_name ON bank_ledger_entries(ledger_name);
    
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_account ON bank_reconciliation(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_date ON bank_reconciliation(statement_date);
    
    CREATE INDEX IF NOT EXISTS idx_transaction_categories_name ON transaction_categories(category_name);
    CREATE INDEX IF NOT EXISTS idx_transaction_categories_type ON transaction_categories(category_type);
    CREATE INDEX IF NOT EXISTS idx_transaction_categories_active ON transaction_categories(is_active);
    
    CREATE INDEX IF NOT EXISTS idx_pdc_transaction ON post_dated_cheques(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_pdc_status ON post_dated_cheques(status);
    CREATE INDEX IF NOT EXISTS idx_pdc_date ON post_dated_cheques(cheque_date);
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
    tagline TEXT DEFAULT 'Your Business Tagline',
    address_line1 TEXT DEFAULT 'Address Line 1',
    address_line2 TEXT DEFAULT 'Address Line 2',
    city TEXT DEFAULT 'City',
    state TEXT DEFAULT 'State',
    pincode TEXT DEFAULT '000000',
    country TEXT DEFAULT 'India',
    phone TEXT DEFAULT '0000000000',
    mobile TEXT DEFAULT '0000000000',
    email TEXT DEFAULT 'info@company.com',
    website TEXT DEFAULT 'www.company.com',
    gstin TEXT DEFAULT '',
    pan TEXT DEFAULT '',
    cin TEXT DEFAULT '',
    logo_path TEXT DEFAULT '',
    footer_text TEXT DEFAULT 'Thank you for your business!',
    bank_name TEXT DEFAULT '',
    bank_account_number TEXT DEFAULT '',
    bank_ifsc TEXT DEFAULT '',
    bank_branch TEXT DEFAULT '',
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
