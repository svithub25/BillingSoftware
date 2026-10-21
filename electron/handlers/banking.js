export function registerBankingHandlers({ ipcMain, getDb }) {
  // ==================== BANK ACCOUNTS ====================

  ipcMain.handle("get-bank-accounts", async () => {
    const db = getDb();
    return db
      .prepare(
        `
      SELECT * FROM bank_accounts 
      WHERE status_code = 0 
      ORDER BY account_name
    `,
      )
      .all();
  });

  ipcMain.handle("get-bank-account-details", async (event, accountId) => {
    const db = getDb();

    const account = db
      .prepare("SELECT * FROM bank_accounts WHERE id = ?")
      .get(accountId);

    // Get recent transactions from the unified ledger
    const recentTransactions = db
      .prepare(
        `
      SELECT t.* 
      FROM transactions t
      JOIN transaction_lines tl ON t.id = tl.transaction_id
      WHERE tl.ledger_type = 'bank_account' AND tl.ledger_id = ?
      AND t.is_deleted = 0
      ORDER BY t.transaction_date DESC, t.id DESC
      LIMIT 10
    `,
      )
      .all(accountId);

    // Get summary from unified ledger
    const summary = db
      .prepare(
        `
      SELECT 
        COUNT(DISTINCT t.id) as total_transactions,
        SUM(tl.debit) as total_debits, -- Debits to bank = Receipts (Money IN)
        SUM(tl.credit) as total_credits -- Credits to bank = Payments (Money OUT)
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE tl.ledger_type = 'bank_account' AND tl.ledger_id = ?
      AND t.is_deleted = 0
    `,
      )
      .get(accountId);

    return {
      account,
      recentTransactions,
      summary,
    };
  });

  ipcMain.handle("add-bank-account", async (event, accountData) => {
    const db = getDb();
    try {
      const result = db
        .prepare(
          `
        INSERT INTO bank_accounts 
        (account_name, account_number, bank_name, branch_name, ifsc_code, account_type, 
         opening_balance, current_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          accountData.account_name,
          accountData.account_number,
          accountData.bank_name,
          accountData.branch_name || "",
          accountData.ifsc_code || "",
          accountData.account_type,
          accountData.opening_balance || 0,
          accountData.opening_balance || 0,
        );
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error("Error adding bank account:", error);
      throw error;
    }
  });

  ipcMain.handle("update-bank-account", async (event, id, accountData) => {
    const db = getDb();
    try {
      db.prepare(
        `
        UPDATE bank_accounts SET
          account_name = ?,
          account_number = ?,
          bank_name = ?,
          branch_name = ?,
          ifsc_code = ?,
          account_type = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      ).run(
        accountData.account_name,
        accountData.account_number,
        accountData.bank_name,
        accountData.branch_name || "",
        accountData.ifsc_code || "",
        accountData.account_type,
        id,
      );
      return { success: true };
    } catch (error) {
      console.error("Error updating bank account:", error);
      throw error;
    }
  });

  ipcMain.handle("delete-bank-account", async (event, id) => {
    const db = getDb();
    try {
      const txnCount = db
        .prepare(
          "SELECT COUNT(*) as count FROM transaction_lines tl JOIN transactions t ON tl.transaction_id = t.id WHERE tl.ledger_type = 'bank_account' AND tl.ledger_id = ? AND t.is_deleted = 0",
        )
        .get(id);

      if (txnCount.count > 0) {
        return {
          success: false,
          message: "Cannot delete account with existing transactions",
        };
      }

      db.prepare("UPDATE bank_accounts SET status_code = 1 WHERE id = ?").run(
        id,
      );
      return { success: true };
    } catch (error) {
      console.error("Error deleting bank account:", error);
      throw error;
    }
  });

  // ==================== VOUCHER GENERATION ====================

  ipcMain.handle("generate-voucher-number", async (event, voucherType) => {
    const db = getDb();
    const prefixMap = {
      Payment: "PAY",
      Receipt: "RCP",
      Contra: "CNT",
    };
    const prefix = prefixMap[voucherType] || "VCH";
    // Map legacy types to unified types if needed, but our unified schema accepts these strings
    const mappedType = voucherType.toLowerCase();

    const lastVoucher = db
      .prepare(
        `
       SELECT voucher_no FROM transactions 
       WHERE voucher_type = ? AND is_deleted = 0
       ORDER BY id DESC LIMIT 1
    `,
      )
      .get(mappedType);

    let nextNumber = 1;
    if (lastVoucher && lastVoucher.voucher_no) {
      const match = lastVoucher.voucher_no.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(6, "0")}`;
  });

  // ==================== TRANSACTIONS ====================

  ipcMain.handle("save-bank-transaction", async (event, transactionData) => {
    const db = getDb();

    try {
      db.prepare("BEGIN TRANSACTION").run();

      // Determine what the party ID refers to (contact or account group)
      // The frontend currently sends 'party_name', but we need IDs for the unified ledger.
      // This requires the frontend to send party_id and party_type.
      // For backward compatibility, if only party_name is sent, try to resolve it.
      let ledgerType = transactionData.party_type || "contact";
      let ledgerId = transactionData.party_id;

      if (!ledgerId && transactionData.party_name) {
        const contact = db
          .prepare(`SELECT id FROM contacts WHERE name = ? AND is_deleted = 0`)
          .get(transactionData.party_name);
        if (contact) {
          ledgerId = contact.id;
          ledgerType = "contact";
        } else {
          const group = db
            .prepare(
              `SELECT id FROM account_groups WHERE name = ? AND is_active = 1`,
            )
            .get(transactionData.party_name);
          if (group) {
            ledgerId = group.id;
            ledgerType = "account_group";
          }
        }
      }

      // Unified Transaction Record
      const mappedVoucherType = transactionData.voucher_type.toLowerCase();

      const insertTxn = db.prepare(`
        INSERT INTO transactions (
          transaction_date, voucher_type, voucher_no, notes, 
          contact_id, bank_account_id, amount, cheque_number, cheque_date, cleared_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const txnResult = insertTxn.run(
        transactionData.transaction_date,
        mappedVoucherType,
        transactionData.voucher_number,
        transactionData.narration || transactionData.party_name || "",
        ledgerType === "contact" ? ledgerId : null,
        transactionData.bank_account_id,
        transactionData.amount,
        transactionData.cheque_number || null,
        transactionData.cheque_date || null,
        transactionData.cheque_number ? "Pending" : "Cleared",
      );

      const transactionId = txnResult.lastInsertRowid;

      // Insert Lines
      const insertLine = db.prepare(`
         INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit)
         VALUES (?, ?, ?, ?, ?)
      `);

      if (mappedVoucherType === "payment") {
        // Payment: Bank Cr, Party/Expense Dr
        insertLine.run(
          transactionId,
          ledgerType,
          ledgerId,
          transactionData.amount,
          0,
        ); // Dr
        insertLine.run(
          transactionId,
          "bank_account",
          transactionData.bank_account_id,
          0,
          transactionData.amount,
        ); // Cr

        // Update bank balance (Cr decreases balance in Bank Accounts context here)
        db.prepare(
          "UPDATE bank_accounts SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(transactionData.amount, transactionData.bank_account_id);

        if (ledgerType === "contact") {
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(transactionData.amount, ledgerId);
        }
      } else if (mappedVoucherType === "receipt") {
        // Receipt: Bank Dr, Party/Income Cr
        insertLine.run(
          transactionId,
          "bank_account",
          transactionData.bank_account_id,
          transactionData.amount,
          0,
        ); // Dr
        insertLine.run(
          transactionId,
          ledgerType,
          ledgerId,
          0,
          transactionData.amount,
        ); // Cr

        // Update bank balance
        db.prepare(
          "UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(transactionData.amount, transactionData.bank_account_id);

        if (ledgerType === "contact") {
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
          ).run(transactionData.amount, ledgerId);
        }
      } else if (mappedVoucherType === "contra") {
        // Contra: Bank A Cr, Bank B Dr
        insertLine.run(
          transactionId,
          "bank_account",
          transactionData.bank_account_id,
          0,
          transactionData.amount,
        ); // Cr
        insertLine.run(
          transactionId,
          "bank_account",
          transactionData.to_account_id,
          transactionData.amount,
          0,
        ); // Dr

        db.prepare(
          "UPDATE bank_accounts SET current_balance = current_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(transactionData.amount, transactionData.bank_account_id);
        db.prepare(
          "UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(transactionData.amount, transactionData.to_account_id);
      }

      // PDC
      if (
        transactionData.is_pdc &&
        transactionData.cheque_number &&
        mappedVoucherType !== "contra"
      ) {
        db.prepare(
          `
          INSERT INTO post_dated_cheques 
          (transaction_id, cheque_number, cheque_date, amount, party_name, bank_name, status)
          VALUES (?, ?, ?, ?, ?, ?, 'Pending')
        `,
        ).run(
          transactionId,
          transactionData.cheque_number,
          transactionData.cheque_date,
          transactionData.amount,
          transactionData.party_name,
          transactionData.bank_name || "",
        );
      }

      // Handle Bill Adjustments
      if (
        transactionData.billAdjustments &&
        transactionData.billAdjustments.length > 0
      ) {
        const insertAdjustment = db.prepare(`
          INSERT INTO bill_adjustments (transaction_id, invoice_id, purchase_id, adjusted_amount)
          VALUES (?, ?, ?, ?)
        `);

        const updateSale = db.prepare(`
          UPDATE sales 
          SET paid_amount = paid_amount + ?, 
              payment_status = CASE 
                WHEN paid_amount + ? >= total_amount THEN 'paid'
                WHEN paid_amount + ? > 0 THEN 'partially_paid'
                ELSE 'pending'
              END
          WHERE id = ?
        `);

        const updatePurchase = db.prepare(`
          UPDATE purchases 
          SET paid_amount = paid_amount + ?, 
              payment_status = CASE 
                WHEN paid_amount + ? >= total_amount THEN 'paid'
                WHEN paid_amount + ? > 0 THEN 'partially_paid'
                ELSE 'pending'
              END
          WHERE id = ?
        `);

        for (const adj of transactionData.billAdjustments) {
          if (!adj.adjusted_amount || adj.adjusted_amount <= 0) continue;

          insertAdjustment.run(
            transactionId,
            adj.invoice_id || null,
            adj.purchase_id || null,
            adj.adjusted_amount,
          );

          if (adj.invoice_id) {
            updateSale.run(
              adj.adjusted_amount,
              adj.adjusted_amount,
              adj.adjusted_amount,
              adj.invoice_id,
            );
          } else if (adj.purchase_id) {
            updatePurchase.run(
              adj.adjusted_amount,
              adj.adjusted_amount,
              adj.adjusted_amount,
              adj.purchase_id,
            );
          }
        }
      }

      db.prepare("COMMIT").run();
      return { success: true, transactionId };
    } catch (error) {
      db.prepare("ROLLBACK").run();
      console.error("Error saving transaction:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "get-bank-transaction-details",
    async (event, transactionId) => {
      const db = getDb();

      const transaction = db
        .prepare(
          `
      SELECT 
        t.id,
        t.voucher_no as voucher_number,
        CASE WHEN t.voucher_type = 'payment' THEN 'Payment'
             WHEN t.voucher_type = 'receipt' THEN 'Receipt'
             WHEN t.voucher_type = 'contra' THEN 'Contra' END as voucher_type,
        t.transaction_date,
        t.bank_account_id,
        t.amount,
        CASE WHEN t.voucher_type IN ('payment', 'contra') THEN 'Debit' ELSE 'Credit' END as transaction_type,
        t.cheque_number,
        t.cheque_date,
        t.notes as narration,
        t.cleared_status,
        t.cleared_date,
        t.reconciled,
        t.reconciled_date,
        t.created_at,
        t.updated_at,
        t.contact_id,
        ba.account_name,
        ba.bank_name,
        ba.account_number
      FROM transactions t
      LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
      WHERE t.id = ?
    `,
        )
        .get(transactionId);

      if (!transaction) return null;

      // Find Party Info
      let party_name = "";
      let party_id = null;
      let party_type = null;

      if (transaction.voucher_type !== "Contra") {
        const nonBankLine = db
          .prepare(
            `
        SELECT ledger_type, ledger_id 
        FROM transaction_lines 
        WHERE transaction_id = ? AND ledger_type != 'bank_account'
        LIMIT 1
      `,
          )
          .get(transactionId);

        if (nonBankLine) {
          party_type = nonBankLine.ledger_type;
          party_id = nonBankLine.ledger_id;
          if (party_type === "contact") {
            const contact = db
              .prepare("SELECT name FROM contacts WHERE id = ?")
              .get(party_id);
            if (contact) party_name = contact.name;
          } else if (party_type === "account_group") {
            const group = db
              .prepare("SELECT name FROM account_groups WHERE id = ?")
              .get(party_id);
            if (group) party_name = group.name;
          }
        } else if (transaction.contact_id) {
          const contact = db
            .prepare("SELECT name FROM contacts WHERE id = ?")
            .get(transaction.contact_id);
          if (contact) {
            party_name = contact.name;
            party_id = transaction.contact_id;
            party_type = "contact";
          }
        }
      } else {
        const otherBankLine = db
          .prepare(
            `
        SELECT ledger_id 
        FROM transaction_lines 
        WHERE transaction_id = ? AND ledger_type = 'bank_account' AND ledger_id != ?
        LIMIT 1
      `,
          )
          .get(transactionId, transaction.bank_account_id);

        if (otherBankLine) {
          transaction.to_account_id = otherBankLine.ledger_id;
          const otherBank = db
            .prepare(
              "SELECT account_name, bank_name FROM bank_accounts WHERE id = ?",
            )
            .get(otherBankLine.ledger_id);
          if (otherBank) {
            party_name = `Transfer to ${otherBank.account_name} (${otherBank.bank_name})`;
          }
        }
      }

      const pdc = db
        .prepare("SELECT * FROM post_dated_cheques WHERE transaction_id = ?")
        .get(transactionId);
      const is_pdc = !!pdc;

      const billAdjustments = db
        .prepare("SELECT * FROM bill_adjustments WHERE transaction_id = ?")
        .all(transactionId);

      return {
        ...transaction,
        party_name,
        party_id,
        party_type,
        is_pdc,
        pdcInfo: pdc,
        billAdjustments,
      };
    },
  );

  ipcMain.handle("get-bank-transactions", async (event, filters) => {
    const db = getDb();

    // We map unified transactions back to the format expected by the frontend
    let query = `
      SELECT 
        t.id,
        t.voucher_no as voucher_number,
        CASE WHEN t.voucher_type = 'payment' THEN 'Payment'
             WHEN t.voucher_type = 'receipt' THEN 'Receipt'
             WHEN t.voucher_type = 'contra' THEN 'Contra' END as voucher_type,
        t.transaction_date,
        t.bank_account_id,
        c.name as party_name,
        t.amount,
        CASE WHEN t.voucher_type IN ('payment', 'contra') THEN 'Debit' ELSE 'Credit' END as transaction_type,
        t.cheque_number,
        t.cheque_date,
        t.notes as narration,
        t.cleared_status,
        t.cleared_date,
        t.reconciled,
        t.reconciled_date,
        t.created_at,
        t.updated_at,
        ba.account_name,
        ba.bank_name
      FROM transactions t
      LEFT JOIN bank_accounts ba ON t.bank_account_id = ba.id
      LEFT JOIN contacts c ON t.contact_id = c.id
      WHERE t.is_deleted = 0 
      AND t.voucher_type IN ('payment', 'receipt', 'contra')
    `;

    const params = [];

    if (filters?.startDate && filters?.endDate) {
      query += " AND t.transaction_date BETWEEN ? AND ?";
      params.push(filters.startDate, filters.endDate);
    }

    if (filters?.bank_account_id) {
      query += " AND t.bank_account_id = ?";
      params.push(filters.bank_account_id);
    }

    if (filters?.voucher_type) {
      query += " AND t.voucher_type = ?";
      params.push(filters.voucher_type.toLowerCase());
    }

    if (filters?.cleared_status) {
      query += " AND t.cleared_status = ?";
      params.push(filters.cleared_status);
    }

    query += " ORDER BY t.transaction_date DESC, t.id DESC";

    return db.prepare(query).all(...params);
  });

  ipcMain.handle("delete-bank-transaction", async (event, transactionId) => {
    const db = getDb();
    try {
      db.prepare("BEGIN TRANSACTION").run();

      const transaction = db
        .prepare("SELECT * FROM transactions WHERE id = ?")
        .get(transactionId);
      if (!transaction) throw new Error("Transaction not found");

      // Reverse bank balances
      const lines = db
        .prepare(
          "SELECT * FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'bank_account'",
        )
        .all(transactionId);

      for (const line of lines) {
        if (line.debit > 0) {
          // It was a Debit to bank (receipt), so subtract to reverse
          db.prepare(
            "UPDATE bank_accounts SET current_balance = current_balance - ? WHERE id = ?",
          ).run(line.debit, line.ledger_id);
        }
        if (line.credit > 0) {
          // It was a Credit to bank (payment), so add back to reverse
          db.prepare(
            "UPDATE bank_accounts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(line.credit, line.ledger_id);
        }
      }

      // Reverse contact balances
      const contactLines = db
        .prepare(
          "SELECT * FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'contact'",
        )
        .all(transactionId);
      for (const line of contactLines) {
        if (line.debit > 0) {
          // It was a Debit to contact (payment), so subtract to reverse
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
          ).run(line.debit, line.ledger_id);
        }
        if (line.credit > 0) {
          // It was a Credit to contact (receipt), so add back to reverse
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(line.credit, line.ledger_id);
        }
      }

      // Reverse bill adjustments
      const adjustments = db
        .prepare("SELECT * FROM bill_adjustments WHERE transaction_id = ?")
        .all(transactionId);

      const updateSale = db.prepare(`
        UPDATE sales 
        SET paid_amount = paid_amount - ?, 
            payment_status = CASE 
              WHEN paid_amount - ? >= total_amount THEN 'paid'
              WHEN paid_amount - ? > 0 THEN 'partially_paid'
              ELSE 'pending'
            END
        WHERE id = ?
      `);

      const updatePurchase = db.prepare(`
        UPDATE purchases 
        SET paid_amount = paid_amount - ?, 
            payment_status = CASE 
              WHEN paid_amount - ? >= total_amount THEN 'paid'
              WHEN paid_amount - ? > 0 THEN 'partially_paid'
              ELSE 'pending'
            END
        WHERE id = ?
      `);

      for (const adj of adjustments) {
        if (adj.invoice_id) {
          updateSale.run(
            adj.adjusted_amount,
            adj.adjusted_amount,
            adj.adjusted_amount,
            adj.invoice_id,
          );
        } else if (adj.purchase_id) {
          updatePurchase.run(
            adj.adjusted_amount,
            adj.adjusted_amount,
            adj.adjusted_amount,
            adj.purchase_id,
          );
        }
      }

      db.prepare("DELETE FROM bill_adjustments WHERE transaction_id = ?").run(
        transactionId,
      );

      db.prepare("UPDATE transactions SET is_deleted = 1 WHERE id = ?").run(
        transactionId,
      );

      db.prepare("COMMIT").run();
      return { success: true };
    } catch (error) {
      db.prepare("ROLLBACK").run();
      console.error("Error deleting transaction:", error);
      throw error;
    }
  });

  // ==================== CATEGORIES (Mapped to Account Groups) ====================

  ipcMain.handle("get-transaction-categories", async (event, type) => {
    const db = getDb();
    // In unified accounting, categories are Account Groups under Income (3) or Expense (4)
    let query = `
      SELECT 
        id, 
        name as category_name, 
        CASE WHEN master_account_id = 3 THEN 'Income' ELSE 'Expense' END as category_type,
        description,
        is_primary as is_default,
        is_active
      FROM account_groups 
      WHERE master_account_id IN (3, 4) AND is_active = 1
    `;

    if (type) {
      const mId = type === "Income" ? 3 : 4;
      query += ` AND master_account_id = ${mId} ORDER BY name`;
      return db.prepare(query).all();
    }

    query += " ORDER BY master_account_id, name";
    return db.prepare(query).all();
  });

  // Add/Update/Delete category handlers can map to add/update/delete account groups
  ipcMain.handle("add-transaction-category", async (event, categoryData) => {
    // Re-route to account groups
    const { ipcMain } = require("electron"); // not ideal but fine for IPC handlers registered globally
    const mId = categoryData.category_type === "Income" ? 3 : 4;
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO account_groups (name, master_account_id, is_primary) VALUES (?, ?, 0)`,
      )
      .run(categoryData.category_name, mId);
    return { success: true, id: result.lastInsertRowid };
  });

  // ==================== PARTY MANAGEMENT (Unified Contacts) ====================

  ipcMain.handle("get-all-parties", async (event, partyType = null) => {
    const db = getDb();
    // Unify all entities that can be parties in a transaction
    // Debtors (13), Creditors (5), Income (mId 3), Expense (mId 4)

    const query = `
       SELECT 
         c.id as party_id,
         'contact' as party_type,
         c.name as name,
         c.phone as contact,
         c.gstin,
         CASE WHEN c.account_group_id = 13 THEN 'Customer' ELSE 'Supplier' END as type
       FROM contacts c 
       WHERE c.is_deleted = 0 AND c.account_group_id IN (5, 13)
       UNION ALL
       SELECT 
         ag.id as party_id,
         'account_group' as party_type,
         ag.name as name,
         '' as contact,
         '' as gstin,
         CASE WHEN ag.master_account_id = 3 THEN 'Income Category' ELSE 'Expense Category' END as type
       FROM account_groups ag
       WHERE ag.is_active = 1 AND ag.master_account_id IN (3, 4)
       ORDER BY name
    `;
    return db.prepare(query).all();
  });

  ipcMain.handle("search-parties", async (event, searchTerm) => {
    const db = getDb();
    if (!searchTerm || searchTerm.length < 2) return [];
    const searchPattern = `%${searchTerm}%`;

    const query = `
       SELECT 
         c.id as party_id,
         'contact' as party_type,
         c.name as name,
         c.phone as contact,
         CASE WHEN c.account_group_id = 13 THEN 'Customer' ELSE 'Supplier' END as type
       FROM contacts c 
       WHERE c.is_deleted = 0 AND c.name LIKE ?
       UNION ALL
       SELECT 
         ag.id as party_id,
         'account_group' as party_type,
         ag.name as name,
         '' as contact,
         CASE WHEN ag.master_account_id = 3 THEN 'Income' ELSE 'Expense' END as type
       FROM account_groups ag
       WHERE ag.is_active = 1 AND ag.name LIKE ?
       ORDER BY name LIMIT 20
    `;
    return db.prepare(query).all(searchPattern, searchPattern);
  });

  // ==================== CHEQUE MANAGEMENT ====================
  // (Left as stub or similar to original, mapping to `post_dated_cheques`)
  ipcMain.handle(
    "update-cheque-status",
    async (event, transactionId, status, clearedDate) => {
      const db = getDb();
      db.prepare(
        `UPDATE transactions SET cleared_status = ?, cleared_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).run(status, clearedDate, transactionId);
      db.prepare(
        `UPDATE post_dated_cheques SET status = ?, cleared_date = ?, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = ?`,
      ).run(status, clearedDate, transactionId);
      return { success: true };
    },
  );

  // Add more methods as needed, preserving existing signatures.

  // ==================== REPORTS ====================
  ipcMain.handle(
    "get-bank-statement",
    async (event, { bankAccountId, startDate, endDate }) => {
      const db = getDb();

      const account = db
        .prepare("SELECT * FROM bank_accounts WHERE id = ?")
        .get(bankAccountId);

      const transactions = db
        .prepare(
          `
      SELECT 
         t.id, t.transaction_date, t.voucher_no as voucher_number, t.voucher_type,
         t.notes as narration, t.cheque_number,
         CASE WHEN tl.debit > 0 THEN tl.debit ELSE tl.credit END as amount,
         CASE WHEN tl.debit > 0 THEN 'Credit' ELSE 'Debit' END as transaction_type
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE tl.ledger_type = 'bank_account' AND tl.ledger_id = ?
      AND t.transaction_date BETWEEN ? AND ?
      AND t.is_deleted = 0
      ORDER BY t.transaction_date ASC, t.id ASC
    `,
        )
        .all(bankAccountId, startDate, endDate);

      const priorTransactions = db
        .prepare(
          `
      SELECT 
        SUM(tl.debit) as total_receipts,
        SUM(tl.credit) as total_payments
      FROM transaction_lines tl
      JOIN transactions t ON tl.transaction_id = t.id
      WHERE tl.ledger_type = 'bank_account' AND tl.ledger_id = ?
      AND t.transaction_date < ?
      AND t.is_deleted = 0
    `,
        )
        .get(bankAccountId, startDate);

      const openingBalance =
        account.opening_balance +
        (priorTransactions.total_receipts || 0) -
        (priorTransactions.total_payments || 0);

      let runningBalance = openingBalance;
      const transactionsWithBalance = transactions.map((txn) => {
        if (txn.transaction_type === "Credit")
          runningBalance += txn.amount; // Receipt
        else runningBalance -= txn.amount; // Payment
        return { ...txn, running_balance: runningBalance };
      });

      return {
        account,
        transactions: transactionsWithBalance,
        openingBalance,
        closingBalance: runningBalance,
      };
    },
  );
}
