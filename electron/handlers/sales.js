export function registerSalesHandlers({ ipcMain, getDb }) {
  ipcMain.handle('generate-bill-number', async () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const yearSuffix = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;

    const lastBill = getDb().prepare(`
      SELECT bill_number FROM sales
      WHERE bill_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`SVBS/${yearSuffix}/%`);

    let nextNumber = 1;
    if (lastBill?.bill_number) {
      const match = lastBill.bill_number.match(/SVBS\/\d{2}-\d{2}\/(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `SVBS/${yearSuffix}/${nextNumber.toString().padStart(0, '0')}`;
  });

  ipcMain.handle('save-sale', async (event, saleData) => {
    const {
      bill_number,
      customer_name,
      customer_contact,
      customer_address,
      customer_gstin,
      shipped_to_name,
      shipped_to_contact,
      shipped_to_address,
      shipped_to_gstin,
      is_shipped_different,
      sale_date,
      items,
      discount,
      total_amount,
      rounding_off,
      salesman_id,
      sale_type
    } = saleData;

    const db = getDb();
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        bill_number, customer_name, customer_contact, customer_address, customer_gstin,
        shipped_to_name, shipped_to_contact, shipped_to_address, shipped_to_gstin, is_shipped_different,
        sale_date, discount, total_amount, rounding_off, salesman_id, sale_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const saleResult = saleStmt.run(
      bill_number,
      customer_name,
      customer_contact,
      customer_address,
      customer_gstin,
      shipped_to_name || null,
      shipped_to_contact || null,
      shipped_to_address || null,
      shipped_to_gstin || null,
      is_shipped_different ? 1 : 0,
      sale_date,
      discount,
      total_amount,
      rounding_off,
      salesman_id,
      sale_type || 'customer'
    );
    
    const saleId = saleResult.lastInsertRowid;

    const saleItemStmt = db.prepare(
      'INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price, sale_type) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const updateStockStmt = db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?');

    // Prepare cost allocation insert
    const costAllocStmt = db.prepare(`
      INSERT INTO sale_item_cost_allocation (
        sale_item_id, purchase_item_id, quantity_allocated, purchase_rate, cost_amount
      ) VALUES (?, ?, ?, ?, ?)
    `);

    items.forEach((item) => {
      // Save sale item
      const saleItemResult = saleItemStmt.run(
        saleId,
        item.id,
        item.quantity,
        item.unit_price,
        item.total_price,
        sale_type || 'customer'
      );
      const saleItemId = saleItemResult.lastInsertRowid;

      // Update stock
      updateStockStmt.run(item.quantity, item.id);

      // Save batch allocations if present
      if (item.batches && Array.isArray(item.batches)) {
        item.batches.forEach(batch => {
          // Find purchase_item_id from item_batches table
          const batchRow = db.prepare('SELECT purchase_item_id FROM item_batches WHERE id = ?').get(batch.batch_id);
          if (batchRow) {
            costAllocStmt.run(
              saleItemId,
              batchRow.purchase_item_id,
              batch.qty,
              batch.purchase_rate,
              batch.qty * batch.purchase_rate
            );
            // Update batch qty_available
            db.prepare('UPDATE item_batches SET qty_available = qty_available - ? WHERE id = ?')
              .run(batch.qty, batch.batch_id);
          }
        });
      }
    });

    return { success: true, saleId };
  });

  ipcMain.handle('delete-bill', async (event, billId) => {
    const db = getDb();
    const saleItems = db.prepare(
      'SELECT item_id, quantity FROM sale_items WHERE sale_id = ? AND (status_code = 0 OR status_code IS NULL)'
    ).all(billId);

    saleItems.forEach((item) => {
      db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?').run(item.quantity, item.item_id);
    });

    db.prepare('UPDATE sales SET status_code = 1 WHERE id = ?').run(billId);
    db.prepare('UPDATE sale_items SET status_code = 1 WHERE sale_id = ?').run(billId);

    return { success: true };
  });

  ipcMain.handle('get-sale-details', async (event, saleId) => {
    try {
      const db = getDb();
      const sale = db.prepare(`
        SELECT s.*, sm.name as salesman_name, sm.contact_info as salesman_contact, sm.address as salesman_address
        FROM sales s
        LEFT JOIN salesman sm ON s.salesman_id = sm.id
        WHERE s.id = ?
      `).get(saleId);

      if (!sale) {
        throw new Error('Sale not found');
      }

      const items = db.prepare(`
        SELECT si.*, i.name as item_name, i.hsn_code, i.sku, i.current_stock
        FROM sale_items si
        LEFT JOIN items i ON si.item_id = i.id
        WHERE si.sale_id = ?
        AND (si.status_code = 0 OR si.status_code IS NULL)
      `).all(saleId);

      return {
        ...sale,
        salesman: sale.salesman_name,
        salesman_contact_info: sale.salesman_contact,
        salesman_address: sale.salesman_address,
        items
      };
    } catch (error) {
      console.error('Error getting sale details:', error);
      throw error;
    }
  });

  ipcMain.handle('update-sale', async (event, saleId, updatedSale) => {
    const db = getDb();
    
    const oldItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    const oldMap = {};
    oldItems.forEach((item) => {
      oldMap[item.item_id] = item;
    });
    const newMap = {};
    updatedSale.items.forEach((item) => {
      newMap[item.id] = item;
    });

    for (const oldItem of oldItems) {
      const newItem = newMap[oldItem.item_id];
      if (!newItem) {
        db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?').run(oldItem.quantity, oldItem.item_id);
      } else if (parseFloat(newItem.quantity) !== parseFloat(oldItem.quantity)) {
        db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?')
          .run(oldItem.quantity - parseFloat(newItem.quantity), oldItem.item_id);
      }
    }

    for (const newItem of updatedSale.items) {
      if (!oldMap[newItem.id]) {
        db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?')
          .run(parseFloat(newItem.quantity), newItem.id);
      }
    }

    db.prepare(`
      UPDATE sales SET
        customer_name = ?,
        customer_contact = ?,
        customer_address = ?,
        customer_gstin = ?,
        shipped_to_name = ?,
        shipped_to_contact = ?,
        shipped_to_address = ?,
        shipped_to_gstin = ?,
        is_shipped_different = ?,
        sale_date = ?,
        discount = ?,
        total_amount = ?,
        rounding_off = ?,
        salesman_id = ?,
        sale_type = ?
      WHERE id = ?
    `).run(
      updatedSale.customer_name,
      updatedSale.customer_contact,
      updatedSale.customer_address,
      updatedSale.customer_gstin,
      updatedSale.shipped_to_name || null,
      updatedSale.shipped_to_contact || null,
      updatedSale.shipped_to_address || null,
      updatedSale.shipped_to_gstin || null,
      updatedSale.is_shipped_different ? 1 : 0,
      updatedSale.sale_date,
      updatedSale.discount,
      updatedSale.total_amount,
      updatedSale.rounding_off,
      updatedSale.salesman_id || null,
      updatedSale.sale_type || 'customer',
      saleId
    );

    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);

    const saleItemStmt = db.prepare(`
      INSERT INTO sale_items
        (sale_id, item_id, quantity, unit_price, total_price, sale_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    updatedSale.items.forEach((item) => {
      saleItemStmt.run(
        saleId,
        item.id,
        parseFloat(item.quantity),
        parseFloat(item.unit_price),
        parseFloat(item.total_price),
        updatedSale.sale_type || 'customer'
      );
    });

    return { success: true };
  });

  ipcMain.handle('get-filtered-sales', async (event, { startDate, endDate, customer, item, salesman }) => {
    let query = `
      SELECT s.*, COUNT(si.id) as item_count,
         COALESCE(s.cgst_total, 0) as cgst_total,
         COALESCE(s.sgst_total, 0) as sgst_total,
         COALESCE(s.is_paid, 0) as is_paid,
         COALESCE(s.is_approved, 0) as is_approved,
         salesman.name AS salesman
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN salesman ON s.salesman_id = salesman.id
      WHERE (s.status_code = 0 OR s.status_code IS NULL)
      AND (si.status_code = 0 OR si.status_code IS NULL)
    `;
    const params = [];

    if (startDate) {
      query += ' AND s.sale_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND s.sale_date <= ?';
      params.push(endDate);
    }
    if (customer) {
      query += ' AND s.customer_name LIKE ?';
      params.push(`%${customer}%`);
    }
    if (item) {
      query += ` AND EXISTS (
        SELECT 1 FROM sale_items si2
        LEFT JOIN items i ON si2.item_id = i.id
        WHERE si2.sale_id = s.id AND i.name LIKE ?
      )`;
      params.push(`%${item}%`);
    }
    if (salesman) {
      query += ' AND s.salesman_id = ?';
      params.push(salesman);
    }

    query += ' GROUP BY s.id ORDER BY s.sale_date DESC';

    return getDb().prepare(query).all(...params);
  });

  ipcMain.handle('get-sales-history', async () => {
    return getDb().prepare(`
      SELECT s.*, COUNT(si.id) as item_count,
          COALESCE(s.cgst_total, 0) as cgst_total,
          COALESCE(s.sgst_total, 0) as sgst_total,
          COALESCE(s.is_paid, 0) as is_paid,
          COALESCE(s.is_approved, 0) as is_approved,
          COALESCE(s.payment_method, '') as payment_method,
          salesman.name AS salesman
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN salesman ON s.salesman_id = salesman.id
      WHERE (s.status_code = 0 OR s.status_code IS NULL)
      AND (si.status_code = 0 OR si.status_code IS NULL)
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `).all();
  });

  ipcMain.handle('update-sale-paid-status', async (event, saleId, isPaid) => {
    const stmt = getDb().prepare('UPDATE sales SET is_paid = ? WHERE id = ?');
    const result = stmt.run(isPaid ? 1 : 0, saleId);
    return result.changes > 0;
  });

  ipcMain.handle('update-sale-approved-status', async (event, saleId, isApproved) => {
    const stmt = getDb().prepare('UPDATE sales SET is_approved = ? WHERE id = ?');
    const result = stmt.run(isApproved ? 1 : 0, saleId);
    return result.changes > 0;
  });

  ipcMain.handle('get-sale-payment-for-approval', async (event, saleId) => {
    const db = getDb();
    const sale = db.prepare(`
      SELECT s.*,
             COALESCE(s.payment_method, '') as payment_method,
             COALESCE(s.is_paid, 0) as is_paid
      FROM sales s
      WHERE s.id = ?
    `).get(saleId);

    if (!sale || !sale.is_paid) {
      return { sale, hasPayment: false, paymentDetails: null };
    }

    const paymentVerification = db.prepare(`
      SELECT * FROM payment_verification
      WHERE sale_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(saleId);

    if (!paymentVerification) {
      return { sale, hasPayment: false, paymentDetails: null };
    }

    let paymentMethodDetails = {};
    switch (paymentVerification.payment_method) {
      case 'upi':
        paymentMethodDetails = db.prepare(
          'SELECT * FROM payment_upi WHERE payment_verification_id = ?'
        ).get(paymentVerification.id) || {};
        break;
      case 'cash':
        paymentMethodDetails = db.prepare(
          'SELECT * FROM payment_cash WHERE payment_verification_id = ?'
        ).get(paymentVerification.id) || {};
        if (paymentMethodDetails.denomination_notes) {
          paymentMethodDetails.denomination_notes = JSON.parse(paymentMethodDetails.denomination_notes);
        }
        break;
      case 'neft_rtgs':
        paymentMethodDetails = db.prepare(
          'SELECT * FROM payment_neft_rtgs WHERE payment_verification_id = ?'
        ).get(paymentVerification.id) || {};
        break;
      case 'cheque':
        paymentMethodDetails = db.prepare(
          'SELECT * FROM payment_cheque WHERE payment_verification_id = ?'
        ).get(paymentVerification.id) || {};
        break;
    }

    return {
      sale,
      hasPayment: true,
      paymentDetails: {
        ...paymentVerification,
        methodDetails: paymentMethodDetails
      }
    };
  });

  ipcMain.handle('get-approval-history', async (event, saleId) => {
    const sale = getDb().prepare(`
      SELECT s.is_approved, s.bill_number, s.total_amount
      FROM sales s
      WHERE s.id = ?
    `).get(saleId);

    return {
      saleId,
      currentStatus: sale?.is_approved === 1 ? 'Approved' : 'Not Approved',
      billNumber: sale?.bill_number,
      totalAmount: sale?.total_amount
    };
  });

}

