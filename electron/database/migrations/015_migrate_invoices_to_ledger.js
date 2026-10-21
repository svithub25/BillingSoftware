export const migration_015_migrate_invoices_to_ledger = {
  name: "015_migrate_invoices_to_ledger",
  up(db) {
    db.exec(`BEGIN TRANSACTION;`);
    try {
      // ================================================================
      // STEP 1: Migrate Missing Sales
      // ================================================================
      const missingSales = db
        .prepare(
          `
        SELECT * FROM sales 
        WHERE (status_code = 0 OR status_code IS NULL) 
        AND contact_id IS NOT NULL AND contact_id != ''
        AND bill_number NOT IN (
          SELECT reference_no FROM transactions WHERE voucher_type = 'sales' AND is_deleted = 0
        )
      `,
        )
        .all();

      const insertTxnStmt = db.prepare(`
        INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, contact_id, amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertLineStmt = db.prepare(`
        INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit)
        VALUES (?, ?, ?, ?, ?)
      `);

      let salesCount = 0;
      for (const sale of missingSales) {
        const txnResult = insertTxnStmt.run(
          sale.sale_date,
          "sales",
          sale.bill_number,
          sale.bill_number,
          sale.contact_id,
          sale.total_amount,
          sale.created_at || new Date().toISOString(),
          sale.created_at || new Date().toISOString(),
        );
        const txnId = txnResult.lastInsertRowid;

        // Debit Contact
        insertLineStmt.run(
          txnId,
          "contact",
          sale.contact_id,
          sale.total_amount,
          0,
        );
        // Credit Sales Accounts (17)
        insertLineStmt.run(txnId, "account_group", 17, 0, sale.total_amount);
        salesCount++;
      }

      // ================================================================
      // STEP 2: Migrate Missing Purchases
      // ================================================================
      const missingPurchases = db
        .prepare(
          `
        SELECT * FROM purchases 
        WHERE (status_code = 0 OR status_code IS NULL) 
        AND contact_id IS NOT NULL AND contact_id != ''
        AND (
           invoice_number NOT IN (SELECT reference_no FROM transactions WHERE voucher_type = 'purchase' AND is_deleted = 0 AND reference_no IS NOT NULL)
           OR (invoice_number IS NULL OR invoice_number = '')
        )
      `,
        )
        .all();

      let purchasesCount = 0;
      for (const purchase of missingPurchases) {
        const voucherNo = `PUR-${purchase.id}`;
        const refNo = purchase.invoice_number || "";

        // Ensure this fallback isn't already migrated (we check by voucher_no now)
        const existingTxn = db
          .prepare(
            `
          SELECT id FROM transactions WHERE voucher_type = 'purchase' AND voucher_no = ? AND is_deleted = 0
        `,
          )
          .get(voucherNo);

        if (!existingTxn) {
          const txnResult = insertTxnStmt.run(
            purchase.purchase_date,
            "purchase",
            voucherNo,
            refNo,
            purchase.contact_id,
            purchase.total_amount,
            purchase.created_at || new Date().toISOString(),
            purchase.created_at || new Date().toISOString(),
          );
          const txnId = txnResult.lastInsertRowid;

          // Debit Purchase Accounts (20)
          insertLineStmt.run(
            txnId,
            "account_group",
            20,
            purchase.total_amount,
            0,
          );
          // Credit Contact
          insertLineStmt.run(
            txnId,
            "contact",
            purchase.contact_id,
            0,
            purchase.total_amount,
          );
          purchasesCount++;
        }
      }

      // ================================================================
      // STEP 3: Recalculate Contact Balances
      // ================================================================
      // We will loop through all contacts and accurately set current_balance
      const contacts = db
        .prepare("SELECT id, opening_balance FROM contacts")
        .all();
      const updateContactStmt = db.prepare(
        "UPDATE contacts SET current_balance = ? WHERE id = ?",
      );

      const balanceQuery = db.prepare(`
        SELECT 
          SUM(tl.debit) as total_debit, 
          SUM(tl.credit) as total_credit
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE tl.ledger_type = 'contact' 
        AND tl.ledger_id = ?
        AND t.is_deleted = 0
      `);

      for (const contact of contacts) {
        const stats = balanceQuery.get(contact.id);
        const debits = stats.total_debit || 0;
        const credits = stats.total_credit || 0;

        // Contact balances: Debit increases balance (they owe us more), Credit decreases balance (we owe them more).
        const calculatedBalance = contact.opening_balance + debits - credits;

        updateContactStmt.run(calculatedBalance, contact.id);
      }

      db.exec(`COMMIT;`);
      console.log(
        `Migration 015 completed: Migrated ${salesCount} sales, ${purchasesCount} purchases, and recalculated balances for ${contacts.length} contacts.`,
      );
    } catch (error) {
      db.exec(`ROLLBACK;`);
      console.error("Migration 015 failed:", error);
      throw error;
    }
  },
};
