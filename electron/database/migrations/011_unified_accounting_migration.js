export const migration_011_unified_accounting_migration = {
  name: "011_unified_accounting_migration",
  up(db) {
    // ================================================================
    // STEP 1: Create new accounting tables
    // ================================================================
    db.exec(`
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
    `);

    // ================================================================
    // STEP 2: Seed master accounts and account groups
    // ================================================================
    db.exec(`
      INSERT OR IGNORE INTO master_accounts (id, name, type, description) VALUES
      (1, 'Capital & Liabilities', 'liabilities', 'Balance Sheet — right side. Includes capital, loans and current liabilities.'),
      (2, 'Assets',                'assets',      'Balance Sheet — left side. Includes fixed assets, current assets and bank balances.'),
      (3, 'Income',                'income',      'Profit & Loss — credit side. All revenue and income streams.'),
      (4, 'Expenses',              'expenses',    'Profit & Loss — debit side. All operating and non-operating expenses.');

      -- LIABILITIES (master_account_id = 1)
      INSERT OR IGNORE INTO account_groups (id, name, master_account_id, parent_group_id, description, is_primary) VALUES
      (1,  'Capital Account',            1, NULL, 'Owner capital, partners capital and reserves',               1),
      (2,  'Reserves & Surplus',         1, NULL, 'Retained earnings and other reserves',                      1),
      (3,  'Loans (Liability)',          1, NULL, 'Long-term borrowings and secured/unsecured loans',           1),
      (4,  'Current Liabilities',        1, NULL, 'Short-term obligations due within one year',                1),
      (5,  'Sundry Creditors',           1, 4,    'Accounts payable — vendors and suppliers',                  1),
      (6,  'Duties & Taxes',             1, 4,    'GST payable, TDS payable and other statutory dues',         1),
      (7,  'Provisions',                 1, 4,    'Provisions for expenses and other liabilities',              1);

      -- ASSETS (master_account_id = 2)
      INSERT OR IGNORE INTO account_groups (id, name, master_account_id, parent_group_id, description, is_primary) VALUES
      (8,  'Fixed Assets',               2, NULL, 'Tangible assets: computers, furniture, equipment',          1),
      (9,  'Investments',                2, NULL, 'Long-term financial investments',                            1),
      (10, 'Current Assets',             2, NULL, 'Assets expected to be converted to cash within one year',   1),
      (11, 'Bank Accounts',              2, 10,   'All bank and digital wallet accounts',                      1),
      (12, 'Cash-in-Hand',               2, 10,   'Petty cash and physical cash balances',                     1),
      (13, 'Sundry Debtors',             2, 10,   'Accounts receivable — customers who owe money',             1),
      (14, 'Loans & Advances (Assets)',  2, 10,   'Advance payments, staff loans and security deposits',       1),
      (15, 'Stock-in-Hand',              2, 10,   'Inventory and consumable stock',                             1),
      (16, 'Misc. Expenses (Assets)',    2, NULL, 'Deferred and prepaid expenses',                              1);

      -- INCOME (master_account_id = 3)
      INSERT OR IGNORE INTO account_groups (id, name, master_account_id, parent_group_id, description, is_primary) VALUES
      (17, 'Sales Accounts',             3, NULL, 'Primary revenue from sale of services or products',         1),
      (18, 'Direct Income',              3, NULL, 'Income directly related to core business activity',          1),
      (19, 'Indirect Income',            3, NULL, 'Other income: interest received, discounts earned, misc.',  1);

      -- EXPENSES (master_account_id = 4)
      INSERT OR IGNORE INTO account_groups (id, name, master_account_id, parent_group_id, description, is_primary) VALUES
      (20, 'Purchase Accounts',          4, NULL, 'Cost of goods or services purchased for resale',            1),
      (21, 'Direct Expenses',            4, NULL, 'Expenses directly related to service delivery / COGS',      1),
      (22, 'Indirect Expenses',          4, NULL, 'Overheads: rent, salaries, admin, utilities, hosting',      1);
    `);

    // ================================================================
    // STEP 3: Migrate transaction_categories → account_groups
    // ================================================================
    let existingCategories = [];
    try {
      existingCategories = db.prepare(`
        SELECT category_name, category_type, description
        FROM transaction_categories
        WHERE is_active = 1
      `).all();
    } catch (e) {}

    const insertGroupStmt = db.prepare(`
      INSERT OR IGNORE INTO account_groups (name, master_account_id, parent_group_id, description, is_primary)
      VALUES (?, ?, ?, ?, 0)
    `);

    for (const cat of existingCategories) {
      if (cat.category_type === 'Expense') {
        // Under Indirect Expenses (id=22), master_account_id=4
        insertGroupStmt.run(cat.category_name, 4, 22, cat.description || '');
      } else if (cat.category_type === 'Income') {
        // Under Indirect Income (id=19), master_account_id=3
        insertGroupStmt.run(cat.category_name, 3, 19, cat.description || '');
      }
    }

    // Build a name→id lookup for the migrated category groups
    const categoryGroupMap = {};
    const allGroups = db.prepare(`SELECT id, name FROM account_groups`).all();
    for (const g of allGroups) {
      categoryGroupMap[g.name] = g.id;
    }

    // ================================================================
    // STEP 4: Migrate customers → contacts (account_group_id = 13 = Sundry Debtors)
    // ================================================================
    db.exec(`
      CREATE TEMPORARY TABLE _migration_customer_map (
        old_id INTEGER PRIMARY KEY,
        new_contact_id INTEGER
      );
    `);

    let customers = [];
    try {
      customers = db.prepare(`
        SELECT * FROM customer WHERE (status_code = 0 OR status_code IS NULL)
      `).all();
    } catch (e) {}

    const insertContactStmt = db.prepare(`
      INSERT INTO contacts (account_group_id, name, phone, email, gstin, state, city, country, address, pincode, credit_limit, credit_days, is_active, is_deleted, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
    `);
    const insertCustomerMapStmt = db.prepare(`
      INSERT INTO _migration_customer_map (old_id, new_contact_id) VALUES (?, ?)
    `);

    for (const c of customers) {
      const result = insertContactStmt.run(
        13, // Sundry Debtors
        c.name,
        c.contact,
        c.email || null,
        c.gstin || null,
        c.state || 'Maharashtra',
        c.city || null,
        c.country || 'India',
        c.address || null,
        c.pincode || null,
        c.credit_limit || 0,
        c.credit_days || 0,
        c.created_at || new Date().toISOString()
      );
      insertCustomerMapStmt.run(c.id, result.lastInsertRowid);
    }

    // Also migrate soft-deleted customers
    let deletedCustomers = [];
    try {
      deletedCustomers = db.prepare(`
        SELECT * FROM customer WHERE status_code = 1
      `).all();
    } catch (e) {}
    for (const c of deletedCustomers) {
      const result = insertContactStmt.run(
        13, c.name, c.contact, c.email || null, c.gstin || null,
        c.state || 'Maharashtra', c.city || null, c.country || 'India',
        c.address || null, c.pincode || null, c.credit_limit || 0, c.credit_days || 0,
        c.created_at || new Date().toISOString()
      );
      // Mark as deleted in contacts
      db.prepare(`UPDATE contacts SET is_deleted = 1 WHERE id = ?`).run(result.lastInsertRowid);
      insertCustomerMapStmt.run(c.id, result.lastInsertRowid);
    }

    // ================================================================
    // STEP 5: Migrate suppliers → contacts (account_group_id = 5 = Sundry Creditors)
    // ================================================================
    db.exec(`
      CREATE TEMPORARY TABLE _migration_supplier_map (
        old_id INTEGER PRIMARY KEY,
        new_contact_id INTEGER
      );
    `);

    let suppliers = [];
    try {
      suppliers = db.prepare(`
        SELECT * FROM suppliers WHERE (status_code = 0 OR status_code IS NULL)
      `).all();
    } catch (e) {}

    const insertSupplierMapStmt = db.prepare(`
      INSERT INTO _migration_supplier_map (old_id, new_contact_id) VALUES (?, ?)
    `);

    for (const s of suppliers) {
      const result = insertContactStmt.run(
        5, // Sundry Creditors
        s.name,
        s.contact,
        s.email || null,
        s.gstin || null,
        s.state || 'Maharashtra',
        s.city || null,
        s.country || 'India',
        s.address || null,
        s.pincode || null,
        0, // credit_limit
        s.credit_days || 0,
        s.created_at || new Date().toISOString()
      );
      insertSupplierMapStmt.run(s.id, result.lastInsertRowid);
    }

    // Also migrate soft-deleted suppliers
    let deletedSuppliers = [];
    try {
      deletedSuppliers = db.prepare(`
        SELECT * FROM suppliers WHERE status_code = 1
      `).all();
    } catch (e) {}
    for (const s of deletedSuppliers) {
      const result = insertContactStmt.run(
        5, s.name, s.contact, s.email || null, s.gstin || null,
        s.state || 'Maharashtra', s.city || null, s.country || 'India',
        s.address || null, s.pincode || null, 0, s.credit_days || 0,
        s.created_at || new Date().toISOString()
      );
      db.prepare(`UPDATE contacts SET is_deleted = 1 WHERE id = ?`).run(result.lastInsertRowid);
      insertSupplierMapStmt.run(s.id, result.lastInsertRowid);
    }

    // ================================================================
    // STEP 6: Add contact_id to sales & purchases, remap
    // ================================================================

    // --- Sales: add contact_id ---
    const salesHasContactId = db.prepare(`PRAGMA table_info(sales)`).all().some(c => c.name === 'contact_id');
    if (!salesHasContactId) {
      db.exec(`ALTER TABLE sales ADD COLUMN contact_id INTEGER REFERENCES contacts(id);`);
    }

    // Match sales to contacts by customer_name + customer_contact
    let allSales = [];
    try {
      allSales = db.prepare(`SELECT id, customer_name, customer_contact FROM sales`).all();
    } catch (e) {}
    const updateSaleContactStmt = db.prepare(`UPDATE sales SET contact_id = ? WHERE id = ?`);

    for (const sale of allSales) {
      let contactId = null;

      // Try matching by phone first (more reliable)
      if (sale.customer_contact) {
        const match = db.prepare(`
          SELECT new_contact_id FROM _migration_customer_map mcm
          JOIN customer c ON c.id = mcm.old_id
          WHERE c.contact = ?
          LIMIT 1
        `).get(sale.customer_contact);
        if (match) contactId = match.new_contact_id;
      }

      // Fallback: match by name
      if (!contactId && sale.customer_name) {
        const match = db.prepare(`
          SELECT new_contact_id FROM _migration_customer_map mcm
          JOIN customer c ON c.id = mcm.old_id
          WHERE TRIM(c.name) = TRIM(?)
          LIMIT 1
        `).get(sale.customer_name);
        if (match) contactId = match.new_contact_id;
      }

      if (contactId) {
        updateSaleContactStmt.run(contactId, sale.id);
      }
    }

    // --- Purchases: add contact_id ---
    const purchasesHasContactId = db.prepare(`PRAGMA table_info(purchases)`).all().some(c => c.name === 'contact_id');
    if (!purchasesHasContactId) {
      db.exec(`ALTER TABLE purchases ADD COLUMN contact_id INTEGER REFERENCES contacts(id);`);
    }

    let allPurchases = [];
    try {
      allPurchases = db.prepare(`SELECT id, supplier_id FROM purchases`).all();
    } catch (e) {}
    const updatePurchaseContactStmt = db.prepare(`UPDATE purchases SET contact_id = ? WHERE id = ?`);

    for (const purchase of allPurchases) {
      if (purchase.supplier_id) {
        const match = db.prepare(`
          SELECT new_contact_id FROM _migration_supplier_map WHERE old_id = ?
        `).get(purchase.supplier_id);
        if (match) {
          updatePurchaseContactStmt.run(match.new_contact_id, purchase.id);
        }
      }
    }

    // ================================================================
    // STEP 7: Remap items.last_supplier_id → last_contact_id
    // ================================================================
    const itemsHasLastContactId = db.prepare(`PRAGMA table_info(items)`).all().some(c => c.name === 'last_contact_id');
    if (!itemsHasLastContactId) {
      db.exec(`ALTER TABLE items ADD COLUMN last_contact_id INTEGER REFERENCES contacts(id);`);
    }

    let itemsWithSupplier = [];
    try {
      itemsWithSupplier = db.prepare(`
        SELECT id, last_supplier_id FROM items WHERE last_supplier_id IS NOT NULL
      `).all();
    } catch (e) {}
    const updateItemContactStmt = db.prepare(`UPDATE items SET last_contact_id = ? WHERE id = ?`);

    for (const item of itemsWithSupplier) {
      const match = db.prepare(`
        SELECT new_contact_id FROM _migration_supplier_map WHERE old_id = ?
      `).get(item.last_supplier_id);
      if (match) {
        updateItemContactStmt.run(match.new_contact_id, item.id);
      }
    }

    // ================================================================
    // STEP 8: Add contact_id to credit_debit_notes
    // ================================================================
    const cdnHasContactId = db.prepare(`PRAGMA table_info(credit_debit_notes)`).all().some(c => c.name === 'contact_id');
    if (!cdnHasContactId) {
      db.exec(`ALTER TABLE credit_debit_notes ADD COLUMN contact_id INTEGER REFERENCES contacts(id);`);
    }

    // ================================================================
    // STEP 9: Migrate bank_transactions → transactions + transaction_lines
    // ================================================================
    db.exec(`
      CREATE TEMPORARY TABLE _migration_bank_txn_map (
        old_id INTEGER PRIMARY KEY,
        new_transaction_id INTEGER
      );
    `);

    let bankTxns = [];
    try {
      bankTxns = db.prepare(`
        SELECT bt.*, ba.account_name as bank_name
        FROM bank_transactions bt
        LEFT JOIN bank_accounts ba ON bt.bank_account_id = ba.id
        WHERE bt.status_code = 0
      `).all();
    } catch (e) {}

    const insertTxnStmt = db.prepare(`
      INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, notes, contact_id, bank_account_id, amount, cheque_number, cheque_date, cleared_status, cleared_date, reconciled, reconciled_date, is_deleted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    const insertLineStmt = db.prepare(`
      INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertBankTxnMapStmt = db.prepare(`
      INSERT INTO _migration_bank_txn_map (old_id, new_transaction_id) VALUES (?, ?)
    `);

    for (const bt of bankTxns) {
      // Map voucher_type: Payment→payment, Receipt→receipt, Contra→contra
      const voucherType = bt.voucher_type.toLowerCase();

      // Try to find the contact_id for this party
      let contactId = null;
      if (bt.party_name) {
        const contactMatch = db.prepare(`
          SELECT id FROM contacts WHERE TRIM(name) = TRIM(?) AND is_deleted = 0 LIMIT 1
        `).get(bt.party_name);
        if (contactMatch) contactId = contactMatch.id;
      }

      const txnResult = insertTxnStmt.run(
        bt.transaction_date,
        voucherType,
        bt.voucher_number,
        null, // reference_no
        bt.narration,
        contactId,
        bt.bank_account_id,
        bt.amount,
        bt.cheque_number,
        bt.cheque_date,
        bt.cleared_status || 'Pending',
        bt.cleared_date,
        bt.reconciled || 0,
        bt.reconciled_date,
        bt.created_at,
        bt.updated_at
      );
      const newTxnId = txnResult.lastInsertRowid;
      insertBankTxnMapStmt.run(bt.id, newTxnId);

      // Get the ledger entries for this old bank transaction
      const ledgerEntries = db.prepare(`
        SELECT * FROM bank_ledger_entries WHERE transaction_id = ?
      `).all(bt.id);

      for (const entry of ledgerEntries) {
        let ledgerType, ledgerId;

        if (entry.ledger_type === 'Bank') {
          ledgerType = 'bank_account';
          ledgerId = bt.bank_account_id;
        } else if (entry.ledger_type === 'Party') {
          ledgerType = 'contact';
          ledgerId = contactId || 0;
        } else if (entry.ledger_type === 'Income') {
          ledgerType = 'account_group';
          // Try to find the account group for this income category
          const groupId = categoryGroupMap[entry.ledger_name];
          ledgerId = groupId || 19; // fallback to Indirect Income
        } else if (entry.ledger_type === 'Expense') {
          ledgerType = 'account_group';
          const groupId = categoryGroupMap[entry.ledger_name];
          ledgerId = groupId || 22; // fallback to Indirect Expenses
        } else {
          ledgerType = 'account_group';
          ledgerId = 22; // fallback
        }

        insertLineStmt.run(
          newTxnId,
          ledgerType,
          ledgerId,
          entry.debit_amount || 0,
          entry.credit_amount || 0
        );
      }
    }

    // Update PDC references if any
    const pdcExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='post_dated_cheques'`).get();
    if (pdcExists) {
      const pdcs = db.prepare(`SELECT id, transaction_id FROM post_dated_cheques`).all();
      for (const pdc of pdcs) {
        const newId = db.prepare(`SELECT new_transaction_id FROM _migration_bank_txn_map WHERE old_id = ?`).get(pdc.transaction_id);
        if (newId) {
          db.prepare(`UPDATE post_dated_cheques SET transaction_id = ? WHERE id = ?`).run(newId.new_transaction_id, pdc.id);
        }
      }
    }

    // ================================================================
    // STEP 10: Drop payment tables
    // ================================================================
    db.exec(`
      DROP TABLE IF EXISTS payment_upi;
      DROP TABLE IF EXISTS payment_cash;
      DROP TABLE IF EXISTS payment_neft_rtgs;
      DROP TABLE IF EXISTS payment_cheque;
      DROP TABLE IF EXISTS payment_verification;
    `);

    // ================================================================
    // STEP 11: Rename old tables (safety backup)
    // ================================================================
    const renameTable = (oldName, newName) => {
      try {
        db.exec(`ALTER TABLE ${oldName} RENAME TO ${newName};`);
      } catch (e) {
        if (!e.message.includes("no such table")) {
          console.warn(`Could not rename ${oldName} to ${newName}:`, e.message);
        }
      }
    };

    renameTable('bank_transactions', 'bank_transactions_old');
    renameTable('bank_ledger_entries', 'bank_ledger_entries_old');
    renameTable('transaction_categories', 'transaction_categories_old');

    // ================================================================
    // STEP 12: Create indexes on new tables
    // ================================================================
    db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_sales_contact ON sales(contact_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_contact ON purchases(contact_id);
      CREATE INDEX IF NOT EXISTS idx_items_last_contact ON items(last_contact_id);
    `);

    // Cleanup temp tables
    db.exec(`
      DROP TABLE IF EXISTS _migration_customer_map;
      DROP TABLE IF EXISTS _migration_supplier_map;
      DROP TABLE IF EXISTS _migration_bank_txn_map;
    `);

    console.log('Migration 011: Unified accounting migration completed successfully.');
  },
};
