export function registerAccountingHandlers({ ipcMain, getDb }) {
  // =========================================================================
  // CORE ACCOUNTING ENGINE (Double-Entry System)
  // =========================================================================

  /**
   * createAccountingTransaction
   * Validates and creates a transaction with multiple lines ensuring debit == credit
   */
  ipcMain.handle('create-accounting-transaction', async (event, transactionData) => {
    const db = getDb();
    
    // 1. Validation: Ensure debits equal credits
    const totalDebit = transactionData.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = transactionData.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    
    // Allow small floating point difference (e.g., 0.01) due to rounding
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry validation failed: Total Debits (${totalDebit}) do not equal Total Credits (${totalCredit}). Difference: ${totalDebit - totalCredit}`);
    }

    const insertTxn = db.prepare(`
      INSERT INTO transactions (
        transaction_date, voucher_type, voucher_no, reference_no, notes, 
        contact_id, bank_account_id, amount, cheque_number, cheque_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLine = db.prepare(`
      INSERT INTO transaction_lines (
        transaction_id, ledger_type, ledger_id, debit, credit
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // 2. Insert main transaction header
      const result = insertTxn.run(
        transactionData.transaction_date,
        transactionData.voucher_type,
        transactionData.voucher_no || `VCH-${Date.now()}`,
        transactionData.reference_no || null,
        transactionData.notes || null,
        transactionData.contact_id || null,
        transactionData.bank_account_id || null,
        totalDebit, // The total amount of the voucher
        transactionData.cheque_number || null,
        transactionData.cheque_date || null
      );
      
      const transactionId = result.lastInsertRowid;

      // 3. Insert all ledger lines
      for (const line of transactionData.lines) {
        if ((line.debit || 0) === 0 && (line.credit || 0) === 0) continue; // Skip zero-value lines
        
        insertLine.run(
          transactionId,
          line.ledger_type, // 'contact', 'bank_account', or 'account_group'
          line.ledger_id,
          line.debit || 0,
          line.credit || 0
        );
      }

      // 4. If there's a PDC, handle it
      if (transactionData.postDatedCheque) {
        db.prepare(`
          INSERT INTO post_dated_cheques (
            transaction_id, cheque_number, cheque_date, amount, party_name, bank_name, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          transactionId,
          transactionData.postDatedCheque.cheque_number,
          transactionData.postDatedCheque.cheque_date,
          transactionData.postDatedCheque.amount || totalDebit,
          transactionData.postDatedCheque.party_name || '',
          transactionData.postDatedCheque.bank_name || null,
          transactionData.postDatedCheque.notes || null
        );
      }

      return transactionId;
    });

    try {
      const id = transaction();
      return { success: true, id };
    } catch (error) {
      console.error("Error creating accounting transaction:", error);
      throw error;
    }
  });

  /**
   * getAccountingTransactions
   * Fetches transactions with optional filters
   */
  ipcMain.handle('get-accounting-transactions', async (event, filters = {}) => {
    const db = getDb();
    let query = `
      SELECT t.*, c.name as contact_name, b.account_name as bank_name
      FROM transactions t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
      WHERE t.is_deleted = 0
    `;
    const params = [];

    if (filters.startDate && filters.endDate) {
      query += ` AND t.transaction_date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }
    
    if (filters.voucher_type) {
      query += ` AND t.voucher_type = ?`;
      params.push(filters.voucher_type);
    }

    if (filters.contact_id) {
      query += ` AND t.contact_id = ?`;
      params.push(filters.contact_id);
    }

    query += ` ORDER BY t.transaction_date DESC, t.id DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }

    return db.prepare(query).all(...params);
  });

  /**
   * getAccountingTransactionDetails
   * Fetches a single transaction along with all its double-entry lines
   */
  ipcMain.handle('get-accounting-transaction-details', async (event, id) => {
    const db = getDb();
    const transaction = db.prepare(`
      SELECT t.*, c.name as contact_name, b.account_name as bank_name
      FROM transactions t
      LEFT JOIN contacts c ON t.contact_id = c.id
      LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
      WHERE t.id = ?
    `).get(id);

    if (!transaction) return null;

    // Fetch the lines and resolve their names
    transaction.lines = db.prepare(`
      SELECT tl.*, 
        CASE 
          WHEN tl.ledger_type = 'contact' THEN c.name
          WHEN tl.ledger_type = 'bank_account' THEN b.account_name
          WHEN tl.ledger_type = 'account_group' THEN ag.name
        END as ledger_name
      FROM transaction_lines tl
      LEFT JOIN contacts c ON tl.ledger_type = 'contact' AND tl.ledger_id = c.id
      LEFT JOIN bank_accounts b ON tl.ledger_type = 'bank_account' AND tl.ledger_id = b.id
      LEFT JOIN account_groups ag ON tl.ledger_type = 'account_group' AND tl.ledger_id = ag.id
      WHERE tl.transaction_id = ?
    `).all(id);

    return transaction;
  });

  // =========================================================================
  // PARTY / CONTACT LEDGER & OUTSTANDING
  // =========================================================================

  /**
   * getContactOutstanding
   * Calculates total outstanding balance for a specific contact across all transactions
   */
  ipcMain.handle('get-contact-outstanding', async (event, contactId) => {
    const db = getDb();
    
    // Get the account group type to know normal balance (Dr vs Cr)
    const contact = db.prepare(`SELECT account_group_id FROM contacts WHERE id = ?`).get(contactId);
    if (!contact) return 0;
    
    // Sundry Debtors (Customers) normal balance is Debit
    // Sundry Creditors (Suppliers) normal balance is Credit
    const isDebtor = (contact.account_group_id === 13);
    
    const result = db.prepare(`
      SELECT 
        SUM(tl.debit) as total_debit,
        SUM(tl.credit) as total_credit
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE tl.ledger_type = 'contact' 
        AND tl.ledger_id = ?
        AND t.is_deleted = 0
    `).get(contactId);

    const totalDebit = result.total_debit || 0;
    const totalCredit = result.total_credit || 0;
    
    if (isDebtor) {
      return totalDebit - totalCredit; // Positive means they owe us
    } else {
      return totalCredit - totalDebit; // Positive means we owe them
    }
  });

  /**
   * getContactLedger
   * Returns a running balance ledger for a specific contact (Tally Party Statement)
   */
  ipcMain.handle('get-contact-ledger', async (event, { contactId, startDate = null, endDate = null }) => {
    const db = getDb();
    
    const contact = db.prepare(`SELECT account_group_id FROM contacts WHERE id = ?`).get(contactId);
    if (!contact) return [];
    
    const isDebtor = (contact.account_group_id === 13);
    
    let query = `
      SELECT 
        t.transaction_date as date,
        t.voucher_type,
        t.voucher_no,
        t.notes as narration,
        tl.debit,
        tl.credit,
        t.id as transaction_id
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE tl.ledger_type = 'contact' 
        AND tl.ledger_id = ?
        AND t.is_deleted = 0
    `;
    const params = [contactId];

    if (startDate && endDate) {
      query += ` AND t.transaction_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY t.transaction_date ASC, t.id ASC`;
    
    const lines = db.prepare(query).all(...params);
    
    // Calculate running balance
    let runningBalance = 0;
    for (const line of lines) {
      if (isDebtor) {
        runningBalance += (line.debit - line.credit);
        line.balance_type = runningBalance >= 0 ? 'Dr' : 'Cr';
      } else {
        runningBalance += (line.credit - line.debit);
        line.balance_type = runningBalance >= 0 ? 'Cr' : 'Dr';
      }
      line.running_balance = Math.abs(runningBalance);
    }
    
    return lines;
  });

  // =========================================================================
  // FINANCIAL REPORTS (Trial Balance, P&L, Balance Sheet engines)
  // =========================================================================

  /**
   * getTrialBalance
   * Aggregates all ledger balances
   */
  ipcMain.handle('get-trial-balance', async (event, { asOfDate = null } = {}) => {
    const db = getDb();
    let dateFilter = asOfDate ? `AND t.transaction_date <= '${asOfDate}'` : '';
    
    // Group all transaction lines by their ledger type and ID
    const query = `
      SELECT 
        tl.ledger_type,
        tl.ledger_id,
        SUM(tl.debit) as total_debit,
        SUM(tl.credit) as total_credit,
        (SUM(tl.debit) - SUM(tl.credit)) as net_balance
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE t.is_deleted = 0 ${dateFilter}
      GROUP BY tl.ledger_type, tl.ledger_id
      HAVING net_balance != 0
    `;
    
    const rawBalances = db.prepare(query).all();
    
    // Now we need to map these to human-readable names and account groups
    const result = {
      contacts: [],
      bank_accounts: [],
      account_groups: [],
      total_debit: 0,
      total_credit: 0
    };
    
    for (const row of rawBalances) {
      let name = '';
      let account_group_id = null;
      
      if (row.ledger_type === 'contact') {
        const c = db.prepare(`SELECT name, account_group_id FROM contacts WHERE id = ?`).get(row.ledger_id);
        name = c ? c.name : 'Unknown Contact';
        account_group_id = c ? c.account_group_id : null;
        result.contacts.push({ ...row, name, account_group_id });
      } else if (row.ledger_type === 'bank_account') {
        const b = db.prepare(`SELECT account_name FROM bank_accounts WHERE id = ?`).get(row.ledger_id);
        name = b ? b.account_name : 'Unknown Bank';
        account_group_id = 11; // Hardcoded Bank Accounts group
        result.bank_accounts.push({ ...row, name, account_group_id });
      } else if (row.ledger_type === 'account_group') {
        const ag = db.prepare(`SELECT name FROM account_groups WHERE id = ?`).get(row.ledger_id);
        name = ag ? ag.name : 'Unknown Group';
        account_group_id = row.ledger_id;
        result.account_groups.push({ ...row, name, account_group_id });
      }
      
      if (row.net_balance > 0) {
        result.total_debit += row.net_balance;
      } else {
        result.total_credit += Math.abs(row.net_balance);
      }
    }
    
    return result;
  });

  /**
   * getAccountGroupBalance
   * Recursively calculates the balance for an account group and all its children/ledgers
   * Used as the building block for P&L and Balance Sheet
   */
  ipcMain.handle('get-account-group-balance', async (event, { groupId, startDate, endDate }) => {
    const db = getDb();
    
    // Utility function to get net balance for a specific group id
    const getNetBalance = (grpId) => {
      let dateFilter = '';
      const params = [];
      if (startDate && endDate) {
        dateFilter = `AND t.transaction_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }
      
      // 1. Get balance of direct account_group entries
      const groupTxns = db.prepare(`
        SELECT SUM(tl.debit) as debit, SUM(tl.credit) as credit
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE tl.ledger_type = 'account_group' AND tl.ledger_id = ? AND t.is_deleted = 0 ${dateFilter}
      `).get(grpId, ...params);
      
      let dr = groupTxns.debit || 0;
      let cr = groupTxns.credit || 0;
      
      // 2. Get balance of contacts under this group
      const contactTxns = db.prepare(`
        SELECT SUM(tl.debit) as debit, SUM(tl.credit) as credit
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        JOIN contacts c ON tl.ledger_type = 'contact' AND tl.ledger_id = c.id
        WHERE c.account_group_id = ? AND t.is_deleted = 0 ${dateFilter}
      `).get(grpId, ...params);
      
      dr += (contactTxns.debit || 0);
      cr += (contactTxns.credit || 0);
      
      // 3. Get balance of bank accounts (if this is group 11 - Bank Accounts)
      if (grpId === 11) {
        const bankTxns = db.prepare(`
          SELECT SUM(tl.debit) as debit, SUM(tl.credit) as credit
          FROM transaction_lines tl
          JOIN transactions t ON tl.transaction_id = t.id
          WHERE tl.ledger_type = 'bank_account' AND t.is_deleted = 0 ${dateFilter}
        `).get(...params);
        dr += (bankTxns.debit || 0);
        cr += (bankTxns.credit || 0);
      }
      
      return { debit: dr, credit: cr };
    };

    // Recursive function to build the tree
    const buildTree = (currentGroupId) => {
      const groupNode = db.prepare(`SELECT * FROM account_groups WHERE id = ?`).get(currentGroupId);
      if (!groupNode) return null;
      
      const balances = getNetBalance(currentGroupId);
      let totalDr = balances.debit;
      let totalCr = balances.credit;
      
      // Find children
      const children = db.prepare(`SELECT id FROM account_groups WHERE parent_group_id = ? AND is_active = 1`).all(currentGroupId);
      const childNodes = [];
      
      for (const child of children) {
        const childNode = buildTree(child.id);
        if (childNode) {
          childNodes.push(childNode);
          totalDr += childNode.total_debit;
          totalCr += childNode.total_credit;
        }
      }
      
      // Master account types determine normal balance
      const isDebitNormal = (groupNode.master_account_id === 2 || groupNode.master_account_id === 4); // Assets or Expenses
      const net = isDebitNormal ? (totalDr - totalCr) : (totalCr - totalDr);
      
      return {
        ...groupNode,
        total_debit: totalDr,
        total_credit: totalCr,
        net_balance: net, // Positive means normal, negative means opposite
        children: childNodes
      };
    };

    return buildTree(groupId);
  });
}
