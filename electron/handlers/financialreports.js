export function registerFinancialReportsHandlers({ ipcMain, getDb }) {
  
  ipcMain.handle('get-profit-and-loss', async (event, { startDate, endDate }) => {
    const db = getDb();
    
    try {
      // 1. REVENUE (Total Sales)
      const salesData = db.prepare(`
        SELECT 
          COALESCE(SUM(s.total_amount), 0) as total_revenue,
          COALESCE(SUM(s.cgst_total + s.sgst_total), 0) as total_gst
        FROM sales s
        WHERE s.sale_date BETWEEN ? AND ?
        AND (s.status_code = 0 OR s.status_code IS NULL)
      `).get(startDate, endDate);

      const revenue = salesData.total_revenue || 0;

      // 2. COST OF GOODS SOLD - Use faster aggregate method
      // Use pre-calculated cost allocations where available
      const totalCOGS = db.prepare(`
        SELECT COALESCE(SUM(sica.cost_amount), 0) as total_cost
        FROM sale_item_cost_allocation sica
        JOIN sale_items si ON sica.sale_item_id = si.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date BETWEEN ? AND ?
        AND (s.status_code = 0 OR s.status_code IS NULL)
      `).get(startDate, endDate);

      let finalCOGS = totalCOGS.total_cost || 0;

      // 3. If no allocations exist, use Opening + Purchases - Closing method
      if (finalCOGS === 0) {
        const openingStockValue = db.prepare(`
          SELECT COALESCE(SUM(opening_amount), 0) as total
          FROM opening_stock
          WHERE opening_date BETWEEN ? AND ?
        `).get(startDate, endDate);

        const purchasesValue = db.prepare(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM purchases
          WHERE purchase_date BETWEEN ? AND ?
          AND (status_code = 0 OR status_code IS NULL)
        `).get(startDate, endDate);

        const closingStockValue = db.prepare(`
          SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total
          FROM items
          WHERE (status_code = 0 OR status_code IS NULL)
        `).get();

        finalCOGS = (openingStockValue.total || 0) + (purchasesValue.total || 0) - (closingStockValue.total || 0);
      }

      // Get stock values for display
      const openingStockValue = db.prepare(`
        SELECT COALESCE(SUM(opening_amount), 0) as total
        FROM opening_stock
         WHERE opening_date BETWEEN ? AND ? 
        `).get(startDate, endDate);

      const purchasesValue = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM purchases
        WHERE purchase_date BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(startDate, endDate);

      const closingStockValue = db.prepare(`
        SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total
        FROM items
        WHERE (status_code = 0 OR status_code IS NULL)
      `).get();

      // 4. GROSS PROFIT
      const grossProfit = revenue - finalCOGS;

      // 5. OPERATING EXPENSES - Optimized query
      const expenseCategories = db.prepare(`
        SELECT 
          COALESCE(tc.category_name, bt.party_name, 'Miscellaneous') as name,
          COALESCE(SUM(bt.amount), 0) as amount
        FROM bank_transactions bt
        LEFT JOIN transaction_categories tc ON bt.party_name = tc.category_name
        WHERE bt.voucher_type = 'Payment'
        AND bt.transaction_date BETWEEN ? AND ?
        AND (bt.status_code = 0 OR bt.status_code IS NULL)
        GROUP BY name
        HAVING amount > 0
        ORDER BY amount DESC
      `).all(startDate, endDate);

      const totalExpenses = expenseCategories.reduce((sum, cat) => sum + (cat.amount || 0), 0);

      // 6. OTHER INCOME
      const otherIncome = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM bank_transactions
        WHERE voucher_type = 'Receipt'
        AND transaction_date BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(startDate, endDate);

      // 7. NET PROFIT
      const netProfit = grossProfit - totalExpenses + (otherIncome.total || 0);

      return {
        revenue: revenue,
        cogs: finalCOGS,
        grossProfit: grossProfit,
        expenses: totalExpenses,
        netProfit: netProfit,
        expenseCategories: expenseCategories,
        otherIncome: otherIncome.total || 0,
        openingStock: openingStockValue.total || 0,
        purchases: purchasesValue.total || 0,
        closingStock: closingStockValue.total || 0
      };

    } catch (error) {
      console.error('Error generating P&L:', error);
      throw error;
    }
  });

  ipcMain.handle('get-balance-sheet', async (event, { asOfDate }) => {
    const db = getDb();
    
    try {
      // Optimized balance sheet queries with proper indexing
      const cashAndBank = db.prepare(`
        SELECT COALESCE(SUM(current_balance), 0) as total
        FROM bank_accounts
        WHERE is_active = 1
        AND (status_code = 0 OR status_code IS NULL)
      `).get();

      const accountsReceivable = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales
        WHERE is_paid = 0
        AND sale_date <= ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(asOfDate);

      const inventory = db.prepare(`
        SELECT COALESCE(SUM(current_stock * purchase_rate), 0) as total
        FROM items
        WHERE (status_code = 0 OR status_code IS NULL)
      `).get();

      const currentAssets = (cashAndBank.total || 0) + (accountsReceivable.total || 0) + (inventory.total || 0);
      const fixedAssets = 0;
      const totalAssets = currentAssets + fixedAssets;

      const accountsPayable = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM purchases
        WHERE is_paid = 0
        AND purchase_date <= ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(asOfDate);

      const shortTermDebt = 0;
      const currentLiabilities = (accountsPayable.total || 0) + shortTermDebt;
      const longTermLiabilities = 0;
      const totalLiabilities = currentLiabilities + longTermLiabilities;

      // Simplified profit calculation
      const profitData = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN s.sale_date <= ? THEN s.total_amount ELSE 0 END), 0) as total_sales,
          COALESCE(SUM(CASE WHEN p.purchase_date <= ? THEN p.total_amount ELSE 0 END), 0) as total_purchases
        FROM 
          (SELECT 1) dummy
        LEFT JOIN sales s ON (s.status_code = 0 OR s.status_code IS NULL)
        LEFT JOIN purchases p ON (p.status_code = 0 OR p.status_code IS NULL)
      `).get(asOfDate, asOfDate);

      const totalExpenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM bank_transactions
        WHERE voucher_type = 'Payment'
        AND transaction_date <= ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(asOfDate);

      const calculatedProfit = (profitData.total_sales || 0) - 
                               (profitData.total_purchases || 0) - 
                               (totalExpenses.total || 0);

      const capital = totalAssets - totalLiabilities - calculatedProfit;
      const equity = capital + calculatedProfit;

      return {
        cash: cashAndBank.total || 0,
        accountsReceivable: accountsReceivable.total || 0,
        inventory: inventory.total || 0,
        currentAssets: currentAssets,
        propertyEquipment: fixedAssets,
        depreciation: 0,
        fixedAssets: fixedAssets,
        totalAssets: totalAssets,
        accountsPayable: accountsPayable.total || 0,
        shortTermDebt: shortTermDebt,
        currentLiabilities: currentLiabilities,
        longTermDebt: longTermLiabilities,
        longTermLiabilities: longTermLiabilities,
        totalLiabilities: totalLiabilities,
        capital: capital,
        retainedEarnings: calculatedProfit,
        equity: equity,
        totalLiabilitiesAndEquity: totalLiabilities + equity
      };

    } catch (error) {
      console.error('Error generating Balance Sheet:', error);
      throw error;
    }
  });
}