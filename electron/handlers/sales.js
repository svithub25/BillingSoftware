export function registerSalesHandlers({ ipcMain, getDb }) {
  ipcMain.handle("generate-bill-number", async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed (January=0, April=3)

    let fyStartYear, fyEndYear;
    if (month >= 3) {
      // April onwards (month 3 = April in 0-indexed)
      fyStartYear = year;
      fyEndYear = year + 1;
    } else {
      // January-March
      fyStartYear = year - 1;
      fyEndYear = year;
    }

    const yearSuffix = `${fyStartYear.toString().slice(-2)}-${fyEndYear.toString().slice(-2)}`;

    const lastBill = getDb()
      .prepare(
        `
      SELECT bill_number FROM sales
      WHERE bill_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `,
      )
      .get(`SVS/${yearSuffix}/%`);

    let nextNumber = 1;
    if (lastBill?.bill_number) {
      const match = lastBill.bill_number.match(/SVS\/\d{2}-\d{2}\/(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `SVS/${yearSuffix}/${nextNumber.toString().padStart(0, "0")}`;
  });

  ipcMain.handle("save-sale", async (event, saleData) => {
    const {
      bill_number,
      contact_id,
      shipped_to_name,
      shipped_to_contact,
      shipped_to_address,
      shipped_to_gstin,
      is_shipped_different,
      sale_date,
      items,
      discount,
      discount_type,
      total_amount,
      cgst_total,
      sgst_total,
      rounding_off,
      salesman_id,
      sale_type,
    } = saleData;

    const subtotalCalc = (items || []).reduce((sum, item) => {
      const gross = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);
      const discVal = parseFloat(item.discount) || 0;
      const iDiscType = item.discount_type || "percent";
      const iDiscAmount = item.discount_amount !== undefined ? parseFloat(item.discount_amount) : (iDiscType === "amount" ? Math.min(gross, discVal) : (gross * discVal) / 100);
      return sum + Math.max(0, gross - iDiscAmount);
    }, 0);
    const saleDiscVal = parseFloat(discount) || 0;
    const saleDiscType = discount_type || "percent";
    const saleDiscAmount = saleData.discount_amount !== undefined ? parseFloat(saleData.discount_amount) : (saleDiscType === "amount" ? Math.min(subtotalCalc, saleDiscVal) : (subtotalCalc * saleDiscVal) / 100);

    const db = getDb();
    const saleStmt = db.prepare(`
      INSERT INTO sales (
        bill_number, contact_id,
        shipped_to_name, shipped_to_contact, shipped_to_address, shipped_to_gstin, is_shipped_different,
        sale_date, discount, discount_type, discount_amount, total_amount, cgst_total, sgst_total, rounding_off, salesman_id, sale_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saleResult = saleStmt.run(
      bill_number,
      contact_id,
      shipped_to_name || null,
      shipped_to_contact || null,
      shipped_to_address || null,
      shipped_to_gstin || null,
      is_shipped_different ? 1 : 0,
      sale_date,
      saleDiscVal,
      saleDiscType,
      saleDiscAmount,
      total_amount,
      cgst_total || 0,
      sgst_total || 0,
      rounding_off,
      salesman_id,
      sale_type || "customer",
    );

    const saleId = saleResult.lastInsertRowid;

    // Get default godown ID
    const defaultGodown = db
      .prepare("SELECT id FROM godowns WHERE is_default = 1 LIMIT 1")
      .get();
    const defaultGodownId = defaultGodown?.id;

    if (!defaultGodownId) {
      throw new Error(
        "Default godown not found. Please set up a default warehouse location.",
      );
    }

    const saleItemStmt = db.prepare(
      "INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, discount, discount_amount, discount_type, total_price, sale_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const updateStockStmt = db.prepare(
      "UPDATE items SET current_stock = current_stock - ? WHERE id = ?",
    );

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
      const gross = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);
      const discVal = parseFloat(item.discount) || 0;
      const iDiscType = item.discount_type || "percent";
      const iDiscAmount = item.discount_amount !== undefined ? parseFloat(item.discount_amount) : (iDiscType === "amount" ? Math.min(gross, discVal) : (gross * discVal) / 100);

      // Save sale item
      const saleItemResult = saleItemStmt.run(
        saleId,
        item.id,
        item.quantity,
        item.unit_price,
        item.gst_percentage || 0,
        item.cgst_amount || 0,
        item.sgst_amount || 0,
        discVal,
        iDiscAmount,
        iDiscType,
        item.total_price,
        sale_type || "customer",
      );
      const saleItemId = saleItemResult.lastInsertRowid;

      // Update global stock
      updateStockStmt.run(item.quantity, item.id);

      // Deduct stock from default godown location
      updateLocationStockStmt.run(
        item.id,
        defaultGodownId,
        -item.quantity,
        -item.quantity,
      );

      // Save batch allocations if present
      if (item.batches && Array.isArray(item.batches)) {
        item.batches.forEach((batch) => {
          // Find purchase_item_id from item_batches table
          const batchRow = db
            .prepare("SELECT purchase_item_id FROM item_batches WHERE id = ?")
            .get(batch.batch_id);
          if (batchRow) {
            costAllocStmt.run(
              saleItemId,
              batchRow.purchase_item_id,
              batch.qty,
              batch.purchase_rate,
              batch.qty * batch.purchase_rate,
            );
            // Update batch qty_available
            db.prepare(
              "UPDATE item_batches SET qty_available = qty_available - ? WHERE id = ?",
            ).run(batch.qty, batch.batch_id);
          }
        });
      }
    });

    // ---------------------------------------------------------
    // Unified Accounting: Record the Sale Transaction
    // ---------------------------------------------------------
    if (contact_id) {
      // 1. Insert Transaction (Voucher)
      const txnResult = db
        .prepare(
          `
        INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, contact_id, amount)
        VALUES (?, 'sales', ?, ?, ?, ?)
      `,
        )
        .run(
          sale_date,
          bill_number,
          bill_number,
          contact_id,
          total_amount,
        );
      const txnId = txnResult.lastInsertRowid;

      // 2. Insert Transaction Lines (Double Entry)
      // Debit: Customer (contact_id)
      // Credit: Sales Accounts (account_group_id = 17)
      const insertLineStmt = db.prepare(`
        INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertLineStmt.run(txnId, "contact", contact_id, total_amount, 0); // Dr
      insertLineStmt.run(txnId, "account_group", 17, 0, total_amount); // Cr

      // 3. Update Contact Balance (Debit -> Add)
      db.prepare(
        "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
      ).run(total_amount, contact_id);
    }

    return { success: true, saleId };
  });

  ipcMain.handle("delete-bill", async (event, billId) => {
    const db = getDb();
    const saleItems = db
      .prepare(
        "SELECT id, item_id, quantity FROM sale_items WHERE sale_id = ? AND (status_code = 0 OR status_code IS NULL)",
      )
      .all(billId);

    // Get default godown ID
    const defaultGodown = db
      .prepare("SELECT id FROM godowns WHERE is_default = 1 LIMIT 1")
      .get();
    const defaultGodownId = defaultGodown?.id;

    saleItems.forEach((item) => {
      // Update global stock
      db.prepare(
        "UPDATE items SET current_stock = current_stock + ? WHERE id = ?",
      ).run(item.quantity, item.item_id);

      // Add stock back to default godown location
      if (defaultGodownId) {
        db.prepare(
          `
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        ).run(item.item_id, defaultGodownId, item.quantity, item.quantity);
      }

      // Restore batch quantities
      const oldAllocations = db
        .prepare(
          `
        SELECT sica.*, ib.id as batch_id
        FROM sale_item_cost_allocation sica
        LEFT JOIN purchase_items pi ON sica.purchase_item_id = pi.id
        LEFT JOIN item_batches ib ON pi.id = ib.purchase_item_id
        WHERE sica.sale_item_id = ?
      `,
        )
        .all(item.id);

      oldAllocations.forEach((alloc) => {
        if (alloc.batch_id) {
          db.prepare(
            "UPDATE item_batches SET qty_available = qty_available + ? WHERE id = ?",
          ).run(alloc.quantity_allocated, alloc.batch_id);
        }
      });
    });

    const saleInfo = db
      .prepare("SELECT contact_id, bill_number FROM sales WHERE id = ?")
      .get(billId);

    db.prepare("UPDATE sales SET status_code = 1 WHERE id = ?").run(billId);
    db.prepare("UPDATE sale_items SET status_code = 1 WHERE sale_id = ?").run(
      billId,
    );

    // ---------------------------------------------------------
    // Unified Accounting: Soft Delete Sale Transaction
    // ---------------------------------------------------------
    const transaction = db
      .prepare(
        "SELECT id FROM transactions WHERE reference_no = ? AND voucher_type = ?",
      )
      .get(saleInfo.bill_number, "sales");
    if (transaction && saleInfo?.contact_id) {
      const debitLine = db
        .prepare(
          "SELECT debit FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'contact' AND ledger_id = ?",
        )
        .get(transaction.id, saleInfo.contact_id);
      if (debitLine && debitLine.debit > 0) {
        // Reverse the debit to customer by subtracting it back
        db.prepare(
          "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
        ).run(debitLine.debit, saleInfo.contact_id);
      }
      db.prepare("UPDATE transactions SET is_deleted = 1 WHERE id = ?").run(
        transaction.id,
      );
    }

    return { success: true };
  });

  ipcMain.handle("get-sale-details", async (event, saleId) => {
    try {
      const db = getDb();
      const sale = db
        .prepare(
          `
        SELECT s.*, c.name as customer_name, c.phone as customer_contact, c.address as customer_address, c.gstin as customer_gstin, sm.name as salesman_name, sm.contact_info as salesman_contact, sm.address as salesman_address
        FROM sales s
        LEFT JOIN contacts c ON s.contact_id = c.id
        LEFT JOIN salesman sm ON s.salesman_id = sm.id
        WHERE s.id = ?
      `,
        )
        .get(saleId);

      if (!sale) {
        throw new Error("Sale not found");
      }

      const items = db
        .prepare(
          `
        SELECT si.*, i.name as item_name, i.hsn_code, i.sku, i.current_stock,
               (SELECT COALESCE(SUM(return_quantity), 0) 
                FROM credit_debit_note_items cdni 
                JOIN credit_debit_notes cdn ON cdn.id = cdni.note_id
                WHERE cdni.original_sale_item_id = si.id AND cdn.status_code = 0) as already_returned
        FROM sale_items si
        LEFT JOIN items i ON si.item_id = i.id
        WHERE si.sale_id = ?
        AND (si.status_code = 0 OR si.status_code IS NULL)
      `,
        )
        .all(saleId);

      // Fetch batch information for each sale item
      const itemsWithBatches = items.map((item) => {
        const batches = db
          .prepare(
            `
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
        `,
          )
          .all(item.id);

        return {
          ...item,
          batches: batches.length > 0 ? batches : null,
        };
      });

      return {
        ...sale,
        salesman: sale.salesman_name,
        salesman_contact_info: sale.salesman_contact,
        salesman_address: sale.salesman_address,
        items: itemsWithBatches,
      };
    } catch (error) {
      console.error("Error getting sale details:", error);
      throw error;
    }
  });

  ipcMain.handle("update-sale", async (event, saleId, updatedSale) => {
    const db = getDb();

    try {
      // Get default godown ID
      const defaultGodown = db
        .prepare("SELECT id FROM godowns WHERE is_default = 1 LIMIT 1")
        .get();
      const defaultGodownId = defaultGodown?.id;

      if (!defaultGodownId) {
        throw new Error(
          "Default godown not found. Please set up a default warehouse location.",
        );
      }

      // Get old sale items with their batch allocations
      const oldItems = db
        .prepare(
          `
        SELECT si.*, 
          GROUP_CONCAT(sica.id) as allocation_ids
        FROM sale_items si
        LEFT JOIN sale_item_cost_allocation sica ON si.id = sica.sale_item_id
        WHERE si.sale_id = ?
        GROUP BY si.id
      `,
        )
        .all(saleId);

      // Get old sale info to reverse balance
      const oldSaleInfo = db
        .prepare("SELECT contact_id, bill_number FROM sales WHERE id = ?")
        .get(saleId);

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
        db.prepare(
          "UPDATE items SET current_stock = current_stock + ? WHERE id = ?",
        ).run(oldItem.quantity, oldItem.item_id);

        // Restore location stock
        db.prepare(
          `
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        ).run(
          oldItem.item_id,
          defaultGodownId,
          oldItem.quantity,
          oldItem.quantity,
        );

        // Restore old batch quantities
        const oldAllocations = db
          .prepare(
            `
          SELECT sica.*, ib.id as batch_id
          FROM sale_item_cost_allocation sica
          LEFT JOIN purchase_items pi ON sica.purchase_item_id = pi.id
          LEFT JOIN item_batches ib ON pi.id = ib.purchase_item_id
          WHERE sica.sale_item_id = ?
        `,
          )
          .all(oldItem.id);

        oldAllocations.forEach((alloc) => {
          if (alloc.batch_id) {
            db.prepare(
              "UPDATE item_batches SET qty_available = qty_available + ? WHERE id = ?",
            ).run(alloc.quantity_allocated, alloc.batch_id);
          }
        });
      }

      // Calculate discount amounts for updatedSale
      const subtotalCalc = (updatedSale.items || []).reduce((sum, item) => {
        const gross = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);
        const discVal = parseFloat(item.discount) || 0;
        const iDiscType = item.discount_type || "percent";
        const iDiscAmount = item.discount_amount !== undefined ? parseFloat(item.discount_amount) : (iDiscType === "amount" ? Math.min(gross, discVal) : (gross * discVal) / 100);
        return sum + Math.max(0, gross - iDiscAmount);
      }, 0);
      const saleDiscVal = parseFloat(updatedSale.discount) || 0;
      const saleDiscType = updatedSale.discount_type || "percent";
      const saleDiscAmount = updatedSale.discount_amount !== undefined ? parseFloat(updatedSale.discount_amount) : (saleDiscType === "amount" ? Math.min(subtotalCalc, saleDiscVal) : (subtotalCalc * saleDiscVal) / 100);

      // Update the sale header
      db.prepare(
        `
        UPDATE sales SET
          contact_id = ?,
          shipped_to_name = ?,
          shipped_to_contact = ?,
          shipped_to_address = ?,
          shipped_to_gstin = ?,
          is_shipped_different = ?,
          sale_date = ?,
          discount = ?,
          discount_type = ?,
          discount_amount = ?,
          total_amount = ?,
          rounding_off = ?,
          salesman_id = ?,
          sale_type = ?
        WHERE id = ?
      `,
      ).run(
        updatedSale.contact_id,
        updatedSale.shipped_to_name || null,
        updatedSale.shipped_to_contact || null,
        updatedSale.shipped_to_address || null,
        updatedSale.shipped_to_gstin || null,
        updatedSale.is_shipped_different ? 1 : 0,
        updatedSale.sale_date,
        saleDiscVal,
        saleDiscType,
        saleDiscAmount,
        updatedSale.total_amount,
        updatedSale.rounding_off,
        updatedSale.salesman_id || null,
        updatedSale.sale_type || "customer",
        saleId,
      );

      // Delete old sale items and cost allocations
      db.prepare(
        "DELETE FROM sale_item_cost_allocation WHERE sale_item_id IN (SELECT id FROM sale_items WHERE sale_id = ?)",
      ).run(saleId);
      db.prepare("DELETE FROM sale_items WHERE sale_id = ?").run(saleId);

      // Re-insert sale items with new batch allocations
      const saleItemStmt = db.prepare(`
        INSERT INTO sale_items
          (sale_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, discount, discount_type, discount_amount, total_price, sale_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const costAllocStmt = db.prepare(`
        INSERT INTO sale_item_cost_allocation (
          sale_item_id, purchase_item_id, quantity_allocated, purchase_rate, cost_amount
        ) VALUES (?, ?, ?, ?, ?)
      `);

      updatedSale.items.forEach((item) => {
        const parsedQty = parseFloat(item.quantity);
        const gross = (parseFloat(item.unit_price) || 0) * parsedQty;
        const discVal = parseFloat(item.discount) || 0;
        const iDiscType = item.discount_type || "percent";
        const iDiscAmount = item.discount_amount !== undefined ? parseFloat(item.discount_amount) : (iDiscType === "amount" ? Math.min(gross, discVal) : (gross * discVal) / 100);

        // Insert sale item
        const saleItemResult = saleItemStmt.run(
          saleId,
          item.id,
          parsedQty,
          parseFloat(item.unit_price),
          item.gst_percentage || 0,
          item.cgst_amount || 0,
          item.sgst_amount || 0,
          discVal,
          iDiscType,
          iDiscAmount,
          parseFloat(item.total_price),
          updatedSale.sale_type || "customer",
        );
        const saleItemId = saleItemResult.lastInsertRowid;

        // Deduct global stock
        db.prepare(
          "UPDATE items SET current_stock = current_stock - ? WHERE id = ?",
        ).run(parsedQty, item.id);

        // Deduct location stock
        db.prepare(
          `
          INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(item_id, godown_id) DO UPDATE SET
            current_stock = current_stock + excluded.current_stock,
            available_stock = available_stock + excluded.available_stock,
            last_movement_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        ).run(item.id, defaultGodownId, -parsedQty, -parsedQty);

        // Insert batch allocations if present
        if (
          item.batches &&
          Array.isArray(item.batches) &&
          item.batches.length > 0
        ) {
          item.batches.forEach((batch) => {
            // Find purchase_item_id from item_batches table
            const batchRow = db
              .prepare("SELECT purchase_item_id FROM item_batches WHERE id = ?")
              .get(batch.batch_id);
            if (batchRow) {
              costAllocStmt.run(
                saleItemId,
                batchRow.purchase_item_id,
                batch.qty,
                batch.purchase_rate,
                batch.qty * batch.purchase_rate,
              );
              // Deduct batch qty_available
              db.prepare(
                "UPDATE item_batches SET qty_available = qty_available - ? WHERE id = ?",
              ).run(batch.qty, batch.batch_id);
            }
          });
        }
      });

      // ---------------------------------------------------------
      // Unified Accounting: Update Sale Transaction
      // ---------------------------------------------------------
      if (updatedSale.contact_id) {
        const transaction = db
          .prepare(
            "SELECT id FROM transactions WHERE reference_no = ? AND voucher_type = ?",
          )
          .get(oldSaleInfo.bill_number, "sales");
        const newTotalAmount = updatedSale.total_amount || 0;

        if (transaction) {
          // Revert old contact balance (it was a debit, so subtract)
          if (oldSaleInfo?.contact_id) {
            const debitLine = db
              .prepare(
                "SELECT debit FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'contact' AND ledger_id = ?",
              )
              .get(transaction.id, oldSaleInfo.contact_id);
            if (debitLine && debitLine.debit > 0) {
              db.prepare(
                "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
              ).run(debitLine.debit, oldSaleInfo.contact_id);
            }
          }

          // Delete old transaction lines
          db.prepare(
            "DELETE FROM transaction_lines WHERE transaction_id = ?",
          ).run(transaction.id);

          // Update transaction header
          db.prepare(
            "UPDATE transactions SET amount = ?, contact_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          ).run(newTotalAmount, updatedSale.contact_id, transaction.id);

          // Insert new lines
          const insertLineStmt = db.prepare(
            "INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit) VALUES (?, ?, ?, ?, ?)",
          );
          insertLineStmt.run(
            transaction.id,
            "contact",
            updatedSale.contact_id,
            newTotalAmount,
            0,
          ); // Dr Customer
          insertLineStmt.run(
            transaction.id,
            "account_group",
            17,
            0,
            newTotalAmount,
          ); // Cr Sales Accounts

          // Apply new contact balance (it is a debit, so add)
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(newTotalAmount, updatedSale.contact_id);
        } else {
          // Create transaction if it didn't exist
          const txnResult = db
            .prepare(
              "INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, contact_id, amount) VALUES (?, 'sales', ?, ?, ?, ?)",
            )
            .run(
              updatedSale.sale_date,
              updatedSale.bill_number,
              updatedSale.bill_number,
              updatedSale.contact_id,
              newTotalAmount,
            );
          const txnId = txnResult.lastInsertRowid;
          const insertLineStmt = db.prepare(
            "INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit) VALUES (?, ?, ?, ?, ?)",
          );
          insertLineStmt.run(
            txnId,
            "contact",
            updatedSale.contact_id,
            newTotalAmount,
            0,
          ); // Dr
          insertLineStmt.run(txnId, "account_group", 17, 0, newTotalAmount); // Cr
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(newTotalAmount, updatedSale.contact_id);
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating sale:", error);
      throw error;
    }
  });

  ipcMain.handle(
    "get-filtered-sales",
    async (event, { startDate, endDate, customer, item, salesman }) => {
      let query = `
      SELECT s.*, COUNT(si.id) as item_count,
         COALESCE(s.cgst_total, 0) as cgst_total,
         COALESCE(s.sgst_total, 0) as sgst_total,
         c.name as customer_name,
         salesman.name AS salesman
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN contacts c ON s.contact_id = c.id
      LEFT JOIN salesman ON s.salesman_id = salesman.id
      WHERE (s.status_code = 0 OR s.status_code IS NULL)
      AND (si.status_code = 0 OR si.status_code IS NULL)
    `;
      const params = [];

      if (startDate) {
        query += " AND s.sale_date >= ?";
        params.push(startDate);
      }
      if (endDate) {
        query += " AND s.sale_date <= ?";
        params.push(endDate);
      }
      if (customer) {
        query += " AND c.name LIKE ?";
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
        query += " AND s.salesman_id = ?";
        params.push(salesman);
      }

      query += " GROUP BY s.id ORDER BY s.sale_date DESC";

      return getDb()
        .prepare(query)
        .all(...params);
    },
  );

  ipcMain.handle("get-sales-history", async () => {
    return getDb()
      .prepare(
        `
      SELECT s.*, COUNT(si.id) as item_count,
          COALESCE(s.cgst_total, 0) as cgst_total,
          COALESCE(s.sgst_total, 0) as sgst_total,
          c.name as customer_name,
          salesman.name AS salesman
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN contacts c ON s.contact_id = c.id
      LEFT JOIN salesman ON s.salesman_id = salesman.id
      WHERE (s.status_code = 0 OR s.status_code IS NULL)
      AND (si.status_code = 0 OR si.status_code IS NULL)
      GROUP BY s.id
      ORDER BY s.sale_date DESC
    `,
      )
      .all();
  });
  ipcMain.handle("get-pending-sales", async (event, contactId) => {
    return getDb()
      .prepare(
        `
      SELECT id, bill_number, sale_date, total_amount, paid_amount, payment_status
      FROM sales
      WHERE contact_id = ? 
        AND payment_status != 'paid' 
        AND (status_code = 0 OR status_code IS NULL)
      ORDER BY sale_date ASC
    `,
      )
      .all(contactId);
  });
}
