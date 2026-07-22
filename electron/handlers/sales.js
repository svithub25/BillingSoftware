export function registerSalesHandlers({ ipcMain, getDb }) {
  ipcMain.handle('generate-bill-number', async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed (January=0, April=3)

    let fyStartYear, fyEndYear;
    if (month >= 3) { // April onwards (month 3 = April in 0-indexed)
      fyStartYear = year;
      fyEndYear = year + 1;
    } else { // January-March
      fyStartYear = year - 1;
      fyEndYear = year;
    }

    const yearSuffix = `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`;

    const lastBill = getDb().prepare(`
      SELECT bill_number FROM sales
      WHERE bill_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`SVS/${yearSuffix}/%`);

    let nextNumber = 1;
    if (lastBill?.bill_number) {
      const match = lastBill.bill_number.match(/SVS\/\d{2}-\d{2}\/(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `SVS/${yearSuffix}/${nextNumber.toString().padStart(0, '0')}`;
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
      cgst_total,
      sgst_total,
      rounding_off,
      salesman_id,
      sale_type
    } = saleData;

    const db = getDb();
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        bill_number, customer_name, customer_contact, customer_address, customer_gstin,
        shipped_to_name, shipped_to_contact, shipped_to_address, shipped_to_gstin, is_shipped_different,
        sale_date, discount, total_amount, cgst_total, sgst_total, rounding_off, salesman_id, sale_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      cgst_total || 0,
      sgst_total || 0,
      rounding_off,
      salesman_id,
      sale_type || 'customer'
    );
    
    const saleId = saleResult.lastInsertRowid;

    // Get default godown ID
    const defaultGodown = db.prepare('SELECT id FROM godowns WHERE is_default = 1 LIMIT 1').get();
    const defaultGodownId = defaultGodown?.id;

    if (!defaultGodownId) {
      throw new Error('Default godown not found. Please set up a default warehouse location.');
    }

    const saleItemStmt = db.prepare(
      'INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, total_price, sale_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const updateStockStmt = db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?');

    // Prepare location stock update statement
    const updateLocationStockStmt = db.prepare(`
      INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(item_id, godown_id) DO UPDATE SET
        current_stock = current_stock + excluded.current_stock,
        available_stock = available_stock + excluded.available_stock,
        last_movement_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

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
        item.gst_percentage || 0,
        item.cgst_amount || 0,
        item.sgst_amount || 0,
        item.total_price,
        sale_type || 'customer'
      );
      const saleItemId = saleItemResult.lastInsertRowid;

      // Update global stock
      updateStockStmt.run(item.quantity, item.id);

      // Deduct stock from default godown location
      updateLocationStockStmt.run(
        item.id,
        defaultGodownId,
        -item.quantity,
        -item.quantity
      );

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
      'SELECT id, item_id, quantity FROM sale_items WHERE sale_id = ? AND (status_code = 0 OR status_code IS NULL)'
    ).all(billId);

    // Get default godown ID
    const defaultGodown = db.prepare('SELECT id FROM godowns WHERE is_default = 1 LIMIT 1').get();
    const defaultGodownId = defaultGodown?.id;

    saleItems.forEach((item) => {
      // Update global stock
      db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?').run(item.quantity, item.item_id);

      // Add stock back to default godown location
      if (defaultGodownId) {
        db.prepare(`
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `).run(item.item_id, defaultGodownId, item.quantity, item.quantity);
      }

      // Restore batch quantities
      const oldAllocations = db.prepare(`
        SELECT sica.*, ib.id as batch_id
        FROM sale_item_cost_allocation sica
        LEFT JOIN purchase_items pi ON sica.purchase_item_id = pi.id
        LEFT JOIN item_batches ib ON pi.id = ib.purchase_item_id
        WHERE sica.sale_item_id = ?
      `).all(item.id);

      oldAllocations.forEach(alloc => {
        if (alloc.batch_id) {
          db.prepare('UPDATE item_batches SET qty_available = qty_available + ? WHERE id = ?')
            .run(alloc.quantity_allocated, alloc.batch_id);
        }
      });
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
        SELECT si.*, i.name as item_name, i.hsn_code, i.sku, i.current_stock,
               (SELECT COALESCE(SUM(return_quantity), 0) 
                FROM credit_debit_note_items cdni 
                JOIN credit_debit_notes cdn ON cdn.id = cdni.note_id
                WHERE cdni.original_sale_item_id = si.id AND cdn.status_code = 0) as already_returned
        FROM sale_items si
        LEFT JOIN items i ON si.item_id = i.id
        WHERE si.sale_id = ?
        AND (si.status_code = 0 OR si.status_code IS NULL)
      `).all(saleId);

      // Fetch batch information for each sale item
      const itemsWithBatches = items.map(item => {
        const batches = db.prepare(`
          SELECT 
            sica.quantity_allocated as qty,
            sica.purchase_rate,
            ib.id as batch_id,
            ib.batch_number,
            ib.mfg_date,
            ib.exp_date,
            ib.mrp
          FROM sale_item_cost_allocation sica
          LEFT JOIN purchase_items pi ON sica.purchase_item_id = pi.id
          LEFT JOIN item_batches ib ON pi.id = ib.purchase_item_id
          WHERE sica.sale_item_id = ?
        `).all(item.id);

        return {
          ...item,
          batches: batches.length > 0 ? batches : null
        };
      });

      return {
        ...sale,
        salesman: sale.salesman_name,
        salesman_contact_info: sale.salesman_contact,
        salesman_address: sale.salesman_address,
        items: itemsWithBatches
      };
    } catch (error) {
      console.error('Error getting sale details:', error);
      throw error;
    }
  });

  ipcMain.handle('update-sale', async (event, saleId, updatedSale) => {
    const db = getDb();
    
    try {
      // Get default godown ID
      const defaultGodown = db.prepare('SELECT id FROM godowns WHERE is_default = 1 LIMIT 1').get();
      const defaultGodownId = defaultGodown?.id;

      if (!defaultGodownId) {
        throw new Error('Default godown not found. Please set up a default warehouse location.');
      }

      // Get old sale items with their batch allocations
      const oldItems = db.prepare(`
        SELECT si.*, 
          GROUP_CONCAT(sica.id) as allocation_ids
        FROM sale_items si
        LEFT JOIN sale_item_cost_allocation sica ON si.id = sica.sale_item_id
        WHERE si.sale_id = ?
        GROUP BY si.id
      `).all(saleId);

      // Build maps for comparison
      const oldMap = {};
      oldItems.forEach((item) => {
        oldMap[item.item_id] = item;
      });

      const newMap = {};
      updatedSale.items.forEach((item) => {
        newMap[item.id] = item;
      });

      // Restore stock for ALL old items completely, as we will re-insert and re-deduct them below
      for (const oldItem of oldItems) {
        // Restore global stock
        db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?')
          .run(oldItem.quantity, oldItem.item_id);
        
        // Restore location stock
        db.prepare(`
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `).run(oldItem.item_id, defaultGodownId, oldItem.quantity, oldItem.quantity);

        // Restore old batch quantities
        const oldAllocations = db.prepare(`
          SELECT sica.*, ib.id as batch_id
          FROM sale_item_cost_allocation sica
          LEFT JOIN purchase_items pi ON sica.purchase_item_id = pi.id
          LEFT JOIN item_batches ib ON pi.id = ib.purchase_item_id
          WHERE sica.sale_item_id = ?
        `).all(oldItem.id);

        oldAllocations.forEach(alloc => {
          if (alloc.batch_id) {
            db.prepare('UPDATE item_batches SET qty_available = qty_available + ? WHERE id = ?')
              .run(alloc.quantity_allocated, alloc.batch_id);
          }
        });
      }

      // Update the sale header
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

      // Delete old sale items and cost allocations
      db.prepare('DELETE FROM sale_item_cost_allocation WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)').run(saleId);
      db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);

      // Re-insert sale items with new batch allocations
      const saleItemStmt = db.prepare(`
        INSERT INTO sale_items
          (sale_id, item_id, quantity, unit_price, total_price, sale_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const costAllocStmt = db.prepare(`
        INSERT INTO sale_item_cost_allocation (
          sale_item_id, purchase_item_id, quantity_allocated, purchase_rate, cost_amount
        ) VALUES (?, ?, ?, ?, ?)
      `);

      updatedSale.items.forEach((item) => {
        const parsedQty = parseFloat(item.quantity);

        // Insert sale item
        const saleItemResult = saleItemStmt.run(
          saleId,
          item.id,
          parsedQty,
          parseFloat(item.unit_price),
          parseFloat(item.total_price),
          updatedSale.sale_type || 'customer'
        );
        const saleItemId = saleItemResult.lastInsertRowid;

        // Deduct global stock
        db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?')
          .run(parsedQty, item.id);
        
        // Deduct location stock
        db.prepare(`
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `).run(item.id, defaultGodownId, -parsedQty, -parsedQty);

        // Insert batch allocations if present
        if (item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
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
              // Deduct batch qty_available
              db.prepare('UPDATE item_batches SET qty_available = qty_available - ? WHERE id = ?')
                .run(batch.qty, batch.batch_id);
            }
          });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
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

