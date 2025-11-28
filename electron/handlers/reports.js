export function registerTransactionHandlers({ ipcMain, getDb }) {
  const costAllocationCache = new Map();

  ipcMain.handle('get-transactions', async (event, { startDate, endDate, type }) => {
    const db = getDb();
    const transactions = [];
    
    // Initialize summary counters
    let totalSalesAmount = 0;
    let totalPurchasesAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let salesCount = 0;
    let purchasesCount = 0;

    if (type === 'all' || type === 'sales') {
      const sales = db.prepare(`
        SELECT
          s.id,
          s.bill_number,
          s.sale_date,
          s.total_amount,
          s.customer_name,
          s.cgst_total,
          s.sgst_total,
          s.discount,
          s.rounding_off
        FROM sales s
        WHERE s.sale_date BETWEEN ? AND ?
        AND (s.status_code = 0 OR s.status_code IS NULL)
        ORDER BY s.sale_date DESC
      `).all(startDate, endDate);

      const allSaleIds = sales.map(s => s.id);
      const saleItemsMap = new Map();
      
      if (allSaleIds.length > 0) {
        const placeholders = allSaleIds.map(() => '?').join(',');
        const allSaleItems = db.prepare(`
          SELECT
            si.id,
            si.sale_id,
            si.item_id,
            si.quantity,
            si.unit_price,
            si.gst_percentage,
            si.cgst_amount,
            si.sgst_amount,
            si.total_price,
            i.name as item_name,
            i.purchase_rate
          FROM sale_items si
          LEFT JOIN items i ON si.item_id = i.id
          WHERE si.sale_id IN (${placeholders})
          AND (si.status_code = 0 OR si.status_code IS NULL)
        `).all(...allSaleIds);

        allSaleItems.forEach(item => {
          if (!saleItemsMap.has(item.sale_id)) {
            saleItemsMap.set(item.sale_id, []);
          }
          saleItemsMap.get(item.sale_id).push(item);
        });
      }

      const existingAllocations = new Map();
      if (allSaleIds.length > 0) {
        const placeholders = allSaleIds.map(() => '?').join(',');
        const allocations = db.prepare(`
          SELECT 
            sica.sale_item_id,
            SUM(sica.cost_amount) as total_cost
          FROM sale_item_cost_allocation sica
          JOIN sale_items si ON sica.sale_item_id = si.id
          WHERE si.sale_id IN (${placeholders})
          GROUP BY sica.sale_item_id
        `).all(...allSaleIds);

        allocations.forEach(alloc => {
          existingAllocations.set(alloc.sale_item_id, alloc.total_cost);
        });
      }

      for (const sale of sales) {
        const saleItems = saleItemsMap.get(sale.id) || [];
        let saleTotalCost = 0;
        let saleTotalRevenue = 0;

        for (const saleItem of saleItems) {
          const itemRevenue = saleItem.total_price || 0;
          saleTotalRevenue += itemRevenue;
          
          let itemCost = existingAllocations.get(saleItem.id) || 0;

          if (itemCost === 0) {
            if (saleItem.purchase_rate > 0) {
              itemCost = saleItem.quantity * saleItem.purchase_rate;
            } else {
              itemCost = saleItem.quantity * saleItem.unit_price * 0.7;
            }
          }

          saleTotalCost += itemCost;
        }

        const totalGST = (sale.cgst_total || 0) + (sale.sgst_total || 0);
        const baseRevenue = saleTotalRevenue - totalGST;
        const grossProfit = baseRevenue - saleTotalCost;
        const profitMargin = baseRevenue > 0 ? ((grossProfit / baseRevenue) * 100).toFixed(2) : 0;

        transactions.push({
          type: 'sale',
          ref_number: sale.bill_number,
          date: sale.sale_date,
          amount: sale.total_amount,
          revenue: saleTotalRevenue,
          base_revenue: baseRevenue,
          cost: saleTotalCost,
          gross_profit: grossProfit,
          profit_margin: profitMargin,
          cgst: sale.cgst_total || 0,
          sgst: sale.sgst_total || 0,
          total_gst: totalGST,
          description: `Sale - ${sale.customer_name || 'Walk-in Customer'}`
        });

        // Update summary counters
        totalSalesAmount += sale.total_amount;
        totalCost += saleTotalCost;
        totalProfit += grossProfit;
        salesCount++;
      }
    }

    if (type === 'all' || type === 'purchases') {
      const purchases = db.prepare(`
        SELECT
          p.id,
          p.invoice_number,
          p.purchase_date,
          p.total_amount,
          p.cgst_total,
          p.sgst_total,
          s.name as supplier_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.purchase_date BETWEEN ? AND ?
        AND (p.status_code = 0 OR p.status_code IS NULL)
        ORDER BY p.purchase_date DESC
      `).all(startDate, endDate);

      for (const purchase of purchases) {
        transactions.push({
          type: 'purchase',
          ref_number: purchase.invoice_number || `PUR-${purchase.id}`,
          date: purchase.purchase_date,
          amount: purchase.total_amount,
          cost: purchase.total_amount,
          revenue: 0,
          base_revenue: 0,
          gross_profit: 0,
          profit_margin: 0,
          cgst: purchase.cgst_total || 0,
          sgst: purchase.sgst_total || 0,
          total_gst: (purchase.cgst_total || 0) + (purchase.sgst_total || 0),
          description: `Purchase - ${purchase.supplier_name || 'Unknown Supplier'}`
        });

        // Update summary counters
        totalPurchasesAmount += purchase.total_amount;
        purchasesCount++;
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Return transactions with pre-calculated summary
    return {
      transactions,
      summary: {
        totalSales: totalSalesAmount,
        totalPurchases: totalPurchasesAmount,
        totalCost: totalCost,
        totalProfit: totalProfit,
        salesCount: salesCount,
        purchasesCount: purchasesCount,
        averageProfit: salesCount > 0 ? (totalProfit / salesCount) : 0,
        profitMargin: totalSalesAmount > 0 ? ((totalProfit / totalSalesAmount) * 100).toFixed(2) : 0
      }
    };
  });

  ipcMain.handle('get-transaction-details', async (event, { type, refNumber }) => {
    const db = getDb();

    if (type === 'sale') {
      const sale = db.prepare(`
        SELECT s.*, sm.name as salesman_name
        FROM sales s
        LEFT JOIN salesman sm ON s.salesman_id = sm.id
        WHERE s.bill_number = ?
      `).get(refNumber);

      if (!sale) return null;

      // Fetch sale items
      const items = db.prepare(`
        SELECT 
          si.*,
          i.name,
          i.unit,
          i.purchase_rate,
          COALESCE((SELECT SUM(cost_amount) FROM sale_item_cost_allocation WHERE sale_item_id = si.id), 0) as allocated_cost
        FROM sale_items si
        LEFT JOIN items i ON si.item_id = i.id
        WHERE si.sale_id = ?
        AND (si.status_code = 0 OR si.status_code IS NULL)
      `).all(sale.id);

      // Fetch batch allocations for each sale item
      const batchAllocStmt = db.prepare(`
        SELECT
          sica.sale_item_id,
          sica.quantity_allocated,
          sica.purchase_rate,
          sica.cost_amount,
          ib.batch_number,
          ib.mfg_date,
          ib.exp_date
        FROM sale_item_cost_allocation sica
        JOIN item_batches ib ON sica.purchase_item_id = ib.purchase_item_id
        WHERE sica.sale_item_id IN (${items.map(() => '?').join(',')})
      `);
      const batchAllocRows = items.length > 0 ? batchAllocStmt.all(...items.map(it => it.id)) : [];

      // Map batch allocations to sale items
      const batchAllocMap = {};
      batchAllocRows.forEach(row => {
        if (!batchAllocMap[row.sale_item_id]) batchAllocMap[row.sale_item_id] = [];
        batchAllocMap[row.sale_item_id].push({
          batch_number: row.batch_number,
          mfg_date: row.mfg_date,
          exp_date: row.exp_date,
          quantity: row.quantity_allocated,
          purchase_rate: row.purchase_rate,
          cost_amount: row.cost_amount
        });
      });

      let totalCost = 0;
      let totalProfit = 0;

      const itemsWithCost = items.map(item => {
        const itemGST = (item.cgst_amount || 0) + (item.sgst_amount || 0);
        const baseRevenue = (item.total_price || 0) - itemGST;

        let itemCost = item.allocated_cost || 0;
        if (itemCost === 0) {
          if (item.purchase_rate > 0) {
            itemCost = item.quantity * item.purchase_rate;
          } else {
            itemCost = item.quantity * item.unit_price * 0.7;
          }
        }

        const itemProfit = baseRevenue - itemCost;
        const profitMargin = baseRevenue > 0 ? ((itemProfit / baseRevenue) * 100).toFixed(2) : 0;

        totalCost += itemCost;
        totalProfit += itemProfit;

        return {
          ...item,
          cost: itemCost,
          profit: itemProfit,
          profit_margin: profitMargin,
          total_amount: item.total_price,
          batches: batchAllocMap[item.id] || []
        };
      });

      const totalGST = (sale.cgst_total || 0) + (sale.sgst_total || 0);
      const baseRevenue = sale.total_amount - totalGST;
      const overallMargin = baseRevenue > 0 ? ((totalProfit / baseRevenue) * 100).toFixed(2) : 0;

      return {
        ...sale,
        items: itemsWithCost,
        summary: {
          total_cost: totalCost,
          total_profit: totalProfit,
          total_gst: totalGST,
          base_revenue: baseRevenue,
          profit_margin: overallMargin
        }
      };
    }

    return null;
  });
}

export function registerAnalyticsHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-analytics-data', async (event, { timeFilter } = {}) => {
    try {
      const now = new Date();
      const endDate = now.toISOString().slice(0, 10);
      let startDate = '1970-01-01';

      switch (timeFilter || 'all') {
        case 'daily': startDate = endDate; break;
        case 'weekly': startDate = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10); break;
        case 'monthly': startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10); break;
        case 'quarterly': startDate = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10); break;
        case 'yearly': startDate = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10); break;
        default: startDate = '1970-01-01';
      }

      const db = getDb();

      // Pre-calculate everything in SQL
      const overview = db.prepare(`
        SELECT 
          COALESCE(SUM(total_amount), 0) AS totalRevenue,
          COUNT(*) AS totalOrders,
          COALESCE(AVG(total_amount), 0) AS avgOrderValue
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
      `).get(startDate, endDate);

      const topCustomer = db.prepare(`
        SELECT
          COALESCE(c.name, s.customer_name, 'N/A') AS customer_name,
          COALESCE(c.contact, s.customer_contact, '') AS customer_contact,
          SUM(s.total_amount) AS revenue
        FROM sales s
        LEFT JOIN customer c ON c.contact = s.customer_contact
        WHERE
          s.customer_contact IS NOT NULL
          AND LENGTH(TRIM(s.customer_contact)) = 10
          AND s.customer_contact GLOB '[0-9]*'
          AND DATE(s.sale_date) BETWEEN ? AND ?
          AND (s.status_code = 0 OR s.status_code IS NULL)
        GROUP BY s.customer_contact
        ORDER BY revenue DESC
        LIMIT 1
      `).get(startDate, endDate);

      const topSellingItems = db.prepare(`
        SELECT 
          i.name,
          SUM(si.quantity) AS quantity,
          SUM(si.total_price) AS revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN items i ON si.item_id = i.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ?
        AND (s.status_code = 0 OR s.status_code IS NULL)
        AND (si.status_code = 0 OR si.status_code IS NULL)
        GROUP BY si.item_id, i.name
        ORDER BY revenue DESC
        LIMIT 10
      `).all(startDate, endDate);

      const salesByCategory = db.prepare(`
        SELECT 
          COALESCE(c.name, 'Uncategorized') AS category,
          SUM(si.total_price) AS amount,
          COUNT(DISTINCT i.id) AS items
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        LEFT JOIN items i ON si.item_id = i.id
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE DATE(s.sale_date) BETWEEN ? AND ?
        AND (s.status_code = 0 OR s.status_code IS NULL)
        AND (si.status_code = 0 OR si.status_code IS NULL)
        GROUP BY c.id, category
        ORDER BY amount DESC
      `).all(startDate, endDate);

      const salesChart = db.prepare(`
        SELECT 
          DATE(sale_date) AS date,
          SUM(total_amount) AS amount,
          COUNT(*) AS orders
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
        GROUP BY DATE(sale_date)
        ORDER BY DATE(sale_date) ASC
      `).all(startDate, endDate);

      const dailyAnalysis = db.prepare(`
        SELECT
          CASE strftime('%w', sale_date)
            WHEN '0' THEN 'Sunday' WHEN '1' THEN 'Monday' WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday' WHEN '4' THEN 'Thursday' WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END AS day,
          AVG(total_amount) AS avgSales,
          SUM(total_amount) AS totalSales,
          COUNT(*) AS orders
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
        GROUP BY strftime('%w', sale_date)
        ORDER BY strftime('%w', sale_date)
      `).all(startDate, endDate);

      const weeklyAnalysis = db.prepare(`
        SELECT
          strftime('%Y-%W', sale_date) AS week,
          MIN(DATE(sale_date)) AS week_start,
          MAX(DATE(sale_date)) AS week_end,
          SUM(total_amount) AS sales,
          COUNT(*) AS orders
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
        GROUP BY week
        ORDER BY week_start ASC
      `).all(startDate, endDate);

      const monthlyTrends = db.prepare(`
        SELECT
          strftime('%Y-%m', sale_date) AS month,
          SUM(total_amount) AS sales,
          COUNT(*) AS orders
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
        GROUP BY month
        ORDER BY month ASC
      `).all(startDate, endDate);

      const yearlyAnalysis = db.prepare(`
        SELECT
          strftime('%Y', sale_date) AS year,
          SUM(total_amount) AS sales,
          COUNT(*) AS orders
        FROM sales
        WHERE DATE(sale_date) BETWEEN ? AND ?
        AND (status_code = 0 OR status_code IS NULL)
        GROUP BY year
        ORDER BY year ASC
      `).all(startDate, endDate);

      const customerAnalysis = db.prepare(`
        WITH per_customer AS (
          SELECT
            COALESCE(c.name, s.customer_name, 'N/A') AS customer_name,
            COALESCE(c.contact, s.customer_contact, '') AS customer_contact,
            SUM(s.total_amount) AS total
          FROM sales s
          LEFT JOIN customer c ON c.contact = s.customer_contact
          WHERE
            s.customer_contact IS NOT NULL
            AND LENGTH(TRIM(s.customer_contact)) = 10
            AND s.customer_contact GLOB '[0-9]*'
            AND DATE(s.sale_date) BETWEEN ? AND ?
          GROUP BY s.customer_contact
        )
        SELECT
          CASE
            WHEN total >= 200000 THEN 'Wholesale'
            WHEN total >= 100000 THEN 'Premium'
            WHEN total >= 20000 THEN 'Regular'
            ELSE 'New'
          END AS segment,
          COUNT(*) AS count,
          SUM(total) AS revenue,
          AVG(total) AS avgOrder
        FROM per_customer
        GROUP BY segment
        ORDER BY revenue DESC
      `).all(startDate, endDate);

      return {
        overview: {
          totalRevenue: overview.totalRevenue || 0,
          totalOrders: overview.totalOrders || 0,
          avgOrderValue: overview.avgOrderValue || 0,
          growthRate: 0,
          topCustomer: topCustomer?.customer_name || 'N/A',
          topCustomerContact: topCustomer?.customer_contact || '',
          topCustomerRevenue: topCustomer?.revenue || 0
        },
        topSellingItems,
        salesByCategory,
        salesChart,
        dailyAnalysis,
        weeklyAnalysis,
        monthlyTrends,
        yearlyAnalysis,
        customerAnalysis
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return {
        overview: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, growthRate: 0, topCustomer: 'N/A' },
        topSellingItems: [], salesByCategory: [], salesChart: [], dailyAnalysis: [],
        weeklyAnalysis: [], monthlyTrends: [], yearlyAnalysis: [], customerAnalysis: []
      };
    }
  });
}


