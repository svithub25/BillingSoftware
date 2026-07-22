export function registerFinancialReportsHandlers({ ipcMain, getDb }) {
  
  ipcMain.handle('get-profit-and-loss', async (event, { startDate, endDate }) => {
    const db = getDb();
    
    try {
      let dateFilter = '';
      const params = [];
      if (startDate && endDate) {
        dateFilter = 'AND t.transaction_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      // Helper to get balance for an account group (direct + child contacts)
      // Normal balance for Income is Credit
      // Normal balance for Expense is Debit
      const getGroupBalance = (groupId, isCreditNormal) => {
        const result = db.prepare(`
          SELECT SUM(tl.debit) as dr, SUM(tl.credit) as cr
          FROM transaction_lines tl
          JOIN transactions t ON tl.transaction_id = t.id
          WHERE t.is_deleted = 0 ${dateFilter}
          AND (
            (tl.ledger_type = 'account_group' AND tl.ledger_id = ?)
            OR 
            (tl.ledger_type = 'contact' AND tl.ledger_id IN (SELECT id FROM contacts WHERE account_group_id = ?))
          )
        `).get(groupId, groupId, ...params, ...params);
        
        const dr = result.dr || 0;
        const cr = result.cr || 0;
        return isCreditNormal ? (cr - dr) : (dr - cr);
      };

      // 1. REVENUE (Sales Accounts - Group 17)
      const revenue = getGroupBalance(17, true);

      // 2. OTHER INCOME (Direct & Indirect Income - Groups 18, 19)
      const directIncome = getGroupBalance(18, true);
      const indirectIncome = getGroupBalance(19, true);
      const otherIncome = directIncome + indirectIncome;

      // 3. COST OF GOODS SOLD (Purchase Accounts - Group 20)
      const purchases = getGroupBalance(20, false);
      
      // Note: In a fully integrated system, closing stock is passed via journal entry.
      // If we don't have stock journal entries yet, we might still need to calculate it manually.
      // For now, let's get the physical stock value for COGS adjustment.
      const closingStockValue = db.prepare(`
        SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total
        FROM items
        WHERE (status_code = 0 OR status_code IS NULL)
      `).get().total || 0;

      // Assuming opening stock is in Group 15 (Stock-in-Hand) but let's query the legacy table if needed
      const openingStockValue = db.prepare(`
        SELECT COALESCE(SUM(opening_amount), 0) as total
        FROM opening_stock
      `).get().total || 0;

      const cogs = openingStockValue + purchases - closingStockValue;

      // 4. GROSS PROFIT
      const grossProfit = revenue - cogs;

      // 5. EXPENSES (Direct 21, Indirect 22)
      // We also want a breakdown of expenses by category (sub-groups or contacts under these)
      const expenseCategories = db.prepare(`
        SELECT 
          ag.name,
          SUM(tl.debit) - SUM(tl.credit) as amount
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        JOIN account_groups ag ON tl.ledger_type = 'account_group' AND tl.ledger_id = ag.id
        WHERE t.is_deleted = 0 ${dateFilter}
        AND ag.master_account_id = 4 -- Expenses
        GROUP BY ag.id
        HAVING amount > 0
        ORDER BY amount DESC
      `).all(...params);

      // Add contact-level expenses (e.g. specific employee salary under indirect expenses)
      const contactExpenses = db.prepare(`
        SELECT 
          c.name,
          SUM(tl.debit) - SUM(tl.credit) as amount
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        JOIN contacts c ON tl.ledger_type = 'contact' AND tl.ledger_id = c.id
        JOIN account_groups ag ON c.account_group_id = ag.id
        WHERE t.is_deleted = 0 ${dateFilter}
        AND ag.master_account_id = 4
        GROUP BY c.id
        HAVING amount > 0
        ORDER BY amount DESC
      `).all(...params);

      const combinedExpenses = [...expenseCategories, ...contactExpenses].sort((a, b) => b.amount - a.amount);
      const totalExpenses = combinedExpenses.reduce((sum, cat) => sum + cat.amount, 0);

      // 7. NET PROFIT
      const netProfit = grossProfit - totalExpenses + otherIncome;

      return {
        revenue,
        cogs,
        grossProfit,
        expenses: totalExpenses,
        netProfit,
        expenseCategories: combinedExpenses,
        otherIncome,
        openingStock: openingStockValue,
        purchases,
        closingStock: closingStockValue
      };

    } catch (error) {
      console.error('Error generating P&L:', error);
      throw error;
    }
  });

  ipcMain.handle('get-balance-sheet', async (event, { asOfDate }) => {
    const db = getDb();
    
    try {
      let dateFilter = asOfDate ? 'AND t.transaction_date <= ?' : '';
      const params = asOfDate ? [asOfDate] : [];

      // Helper to get total balance of a master account
      const getMasterBalance = (masterId, isDebitNormal) => {
        // Includes account_groups, contacts, and bank_accounts
        const result = db.prepare(`
          SELECT 
            SUM(tl.debit) as dr, SUM(tl.credit) as cr
          FROM transaction_lines tl
          JOIN transactions t ON tl.transaction_id = t.id
          WHERE t.is_deleted = 0 ${dateFilter}
          AND (
            (tl.ledger_type = 'account_group' AND tl.ledger_id IN (SELECT id FROM account_groups WHERE master_account_id = ?))
            OR
            (tl.ledger_type = 'contact' AND tl.ledger_id IN (SELECT c.id FROM contacts c JOIN account_groups ag ON c.account_group_id = ag.id WHERE ag.master_account_id = ?))
            OR
            (tl.ledger_type = 'bank_account' AND 2 = ?) -- Bank accounts are Assets (Master ID 2)
          )
        `).get(masterId, masterId, masterId, ...params, ...params, ...params);
        
        const dr = result.dr || 0;
        const cr = result.cr || 0;
        return isDebitNormal ? (dr - cr) : (cr - dr);
      };

      // Assets (Master 2)
      const cashAndBank = db.prepare(`
        SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE is_active = 1
      `).get().total || 0;

      // Accounts Receivable (Sundry Debtors - Group 13)
      const accountsReceivableData = db.prepare(`
        SELECT SUM(tl.debit) - SUM(tl.credit) as total
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE t.is_deleted = 0 ${dateFilter}
        AND tl.ledger_type = 'contact' 
        AND tl.ledger_id IN (SELECT id FROM contacts WHERE account_group_id = 13)
      `).get(...params);
      const accountsReceivable = accountsReceivableData.total || 0;

      const inventory = db.prepare(`
        SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total
        FROM items WHERE (status_code = 0 OR status_code IS NULL)
      `).get().total || 0;

      const currentAssets = cashAndBank + accountsReceivable + inventory;
      const fixedAssets = 0; // Can query Fixed Assets group if needed
      const totalAssets = currentAssets + fixedAssets;

      // Liabilities (Master 1)
      // Accounts Payable (Sundry Creditors - Group 5)
      const accountsPayableData = db.prepare(`
        SELECT SUM(tl.credit) - SUM(tl.debit) as total
        FROM transaction_lines tl
        JOIN transactions t ON tl.transaction_id = t.id
        WHERE t.is_deleted = 0 ${dateFilter}
        AND tl.ledger_type = 'contact' 
        AND tl.ledger_id IN (SELECT id FROM contacts WHERE account_group_id = 5)
      `).get(...params);
      const accountsPayable = accountsPayableData.total || 0;

      const currentLiabilities = accountsPayable;
      const longTermLiabilities = 0;
      const totalLiabilities = currentLiabilities + longTermLiabilities;

      // Calculate Profit to balance the sheet (Income - Expenses)
      const totalIncome = getMasterBalance(3, false); // Income normal is Credit
      const totalExpenses = getMasterBalance(4, true); // Expense normal is Debit
      
      // Adjust for inventory change (Closing - Opening) since it affects profit but isn't journaled yet
      const openingStockValue = db.prepare(`SELECT COALESCE(SUM(opening_amount), 0) as total FROM opening_stock`).get().total || 0;
      const inventoryAdjustment = inventory - openingStockValue;
      
      const calculatedProfit = (totalIncome - totalExpenses) + inventoryAdjustment;

      const capital = totalAssets - totalLiabilities - calculatedProfit;
      const equity = capital + calculatedProfit;

      return {
        cash: cashAndBank,
        accountsReceivable,
        inventory,
        currentAssets,
        propertyEquipment: fixedAssets,
        depreciation: 0,
        fixedAssets,
        totalAssets,
        accountsPayable,
        shortTermDebt: 0,
        currentLiabilities,
        longTermDebt: longTermLiabilities,
        longTermLiabilities,
        totalLiabilities,
        capital,
        retainedEarnings: calculatedProfit,
        equity,
        totalLiabilitiesAndEquity: totalLiabilities + equity
      };

    } catch (error) {
      console.error('Error generating Balance Sheet:', error);
      throw error;
    }
  });
}