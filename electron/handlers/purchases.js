export function registerPurchaseHandlers({ ipcMain, getDb }) {
  ipcMain.handle(
    'save-purchase',
    async (event, { supplier_id, invoice_number, purchase_date, items, total_amount, cgst_total, sgst_total, rounding_off, discount }) => {
      const db = getDb();
      const purchaseStmt = db.prepare(
        'INSERT INTO purchases (supplier_id, invoice_number, purchase_date, total_amount, cgst_total, sgst_total, rounding_off, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const purchaseResult = purchaseStmt.run(
        supplier_id,
        invoice_number,
        purchase_date,
        total_amount,
        cgst_total,
        sgst_total,
        rounding_off,
        discount
      );
      const purchaseId = purchaseResult.lastInsertRowid;

      const purchaseItemStmt = db.prepare(
        'INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, total_price, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const updateItemStmt = db.prepare(
        'UPDATE items SET current_stock = current_stock + ?, last_supplier_id = ?, last_purchase_date = ? WHERE id = ?'
      );
      // Only update purchase_rate if this is the latest purchase for this item
      const updatePurchaseRateStmt = db.prepare(`
        UPDATE items 
        SET purchase_rate = ? 
        WHERE id = ? 
        AND (last_purchase_date IS NULL OR last_purchase_date <= ?)
      `);

      items.forEach((item) => {
        // Insert purchase item (only once!)
        const purchaseItemResult = purchaseItemStmt.run(
          purchaseId,
          item.id,
          item.quantity,
          item.unit_price,
          item.gst_percentage,
          item.cgst_amount,
          item.sgst_amount,
          item.total_price,
          item.discount || 0
        );
        const purchaseItemId = purchaseItemResult.lastInsertRowid;

        // Update stock and last purchase info
        updateItemStmt.run(item.quantity, supplier_id, purchase_date, item.id);
        
        // Only update purchase_rate if this purchase is the latest or newer
        updatePurchaseRateStmt.run(item.unit_price, item.id, purchase_date);

        // Insert batch info for each item row
        db.prepare(`
          INSERT INTO item_batches (
            item_id,
            purchase_item_id,
            batch_number,
            mfg_date,
            exp_date,
            qty_received,
            qty_available,
            purchase_rate,
            mrp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          purchaseItemId,
          item.batch_number || '',
          item.mfg_date || null,
          item.exp_date || null,
          item.quantity,
          item.quantity, // qty_available = qty_received at purchase
          item.unit_price,
          item.mrp || 0
        );
      });

      return { success: true, purchaseId };
    }
  );

  ipcMain.handle('get-purchase-history', async () => {
    return getDb().prepare(`
      SELECT p.*, s.name as supplier_name,
             COALESCE(p.is_paid, 0) as is_paid,
             COALESCE(p.payment_method, '') as payment_method
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE (p.status_code = 0 OR p.status_code IS NULL)
      AND (s.status_code = 0 OR s.status_code IS NULL)
      ORDER BY p.purchase_date DESC
    `).all();
  });

  ipcMain.handle('get-purchase-details', async (event, purchaseId) => {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT
        p.*,
        s.name as supplier_name,
        s.contact as supplier_contact,
        s.address as supplier_address,
        s.gstin as supplier_gstin
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(purchaseId);

    const items = db.prepare(`
      SELECT pi.*, i.name as item_name, i.sku, i.hsn_code, i.unit
      FROM purchase_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.purchase_id = ?
    `).all(purchaseId);

    let cgst_total = 0;
    let sgst_total = 0;
    let gst_total = 0;
    items.forEach((item) => {
      cgst_total += item.cgst_amount || 0;
      sgst_total += item.sgst_amount || 0;
      gst_total += (item.cgst_amount || 0) + (item.sgst_amount || 0);
    });

    return {
      purchase,
      items,
      gst: {
        cgst_total,
        sgst_total,
        gst_total
      }
    };
  });

  ipcMain.handle('get-purchase-full-details', async (event, purchaseId) => {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name, s.contact as supplier_contact, s.address as supplier_address, s.gstin as supplier_gstin
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(purchaseId);

    const items = db.prepare(`
      SELECT pi.*, i.name as item_name, i.sku, i.hsn_code, i.unit
      FROM purchase_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.purchase_id = ?
    `).all(purchaseId);

    return { ...purchase, items };
  });

  ipcMain.handle('delete-purchase', async (event, purchaseId) => {
    const db = getDb();
    const purchaseItems = db.prepare(
      'SELECT item_id, quantity FROM purchase_items WHERE purchase_id = ? AND (status_code = 0 OR status_code IS NULL)'
    ).all(purchaseId);

    for (const item of purchaseItems) {
      const stock = db
        .prepare('SELECT current_stock FROM items WHERE id = ?')
        .get(item.item_id)?.current_stock || 0;
      if (stock - item.quantity < 0) {
        return { success: false, message: `Cannot delete purchase: Stock for item ID ${item.item_id} will go negative.` };
      }
    }

    purchaseItems.forEach((item) => {
      db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?').run(item.quantity, item.item_id);
    });

    db.prepare('UPDATE purchases SET status_code = 1 WHERE id = ?').run(purchaseId);
    db.prepare('UPDATE purchase_items SET status_code = 1 WHERE purchase_id = ?').run(purchaseId);

    return { success: true };
  });

  ipcMain.handle('update-purchase', async (event, purchaseId, updatedPurchase) => {
    const db = getDb();
    
    try {
      db.prepare('BEGIN TRANSACTION').run();

      // Get old purchase items
      const oldItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
      const oldPurchaseItemIds = oldItems.map(item => item.id);
      
      // Get the purchase date to know which sales to recalculate
      const purchaseInfo = db.prepare('SELECT purchase_date FROM purchases WHERE id = ?').get(purchaseId);
      
      // STEP 1: Delete all cost allocations related to this purchase
      if (oldPurchaseItemIds.length > 0) {
        const placeholders = oldPurchaseItemIds.map(() => '?').join(',');
        db.prepare(`
          DELETE FROM sale_item_cost_allocation 
          WHERE purchase_item_id IN (${placeholders})
        `).run(...oldPurchaseItemIds);
      }

      // STEP 2: Get all affected item IDs
      const affectedItemIds = [...new Set([
        ...oldItems.map(item => item.item_id),
        ...updatedPurchase.items.map(item => item.id)
      ])];

      // STEP 3: Get all sales of affected items after this purchase date that need recalculation
      const salesToRecalculate = new Set();
      for (const itemId of affectedItemIds) {
        const sales = db.prepare(`
          SELECT DISTINCT si.sale_id
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE si.item_id = ?
          AND s.sale_date >= ?
          AND (s.status_code = 0 OR s.status_code IS NULL)
          AND (si.status_code = 0 OR si.status_code IS NULL)
        `).all(itemId, purchaseInfo.purchase_date);
        
        sales.forEach(sale => salesToRecalculate.add(sale.sale_id));
      }

      // STEP 4: Delete all cost allocations for sales that need recalculation
      for (const saleId of salesToRecalculate) {
        db.prepare(`
          DELETE FROM sale_item_cost_allocation 
          WHERE sale_item_id IN (
            SELECT id FROM sale_items WHERE sale_id = ?
          )
        `).run(saleId);
      }

      const oldMap = new Map();
      oldItems.forEach((item) => {
        oldMap.set(item.item_id, item);
      });

      const newMap = new Map();
      updatedPurchase.items.forEach((item) => {
        newMap.set(item.id, item);
      });

      // STEP 5: Adjust stock
      for (const oldItem of oldItems) {
        const newItem = newMap.get(oldItem.item_id);
        if (!newItem) {
          // Item removed
          db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ?')
            .run(oldItem.quantity, oldItem.item_id);
        } else if (newItem.quantity !== oldItem.quantity) {
          // Quantity changed
          db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?')
            .run(newItem.quantity - oldItem.quantity, oldItem.item_id);
        }
      }

      for (const newItem of updatedPurchase.items) {
        if (!oldMap.has(newItem.id)) {
          // New item added
          db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?')
            .run(newItem.quantity, newItem.id);
        }
      }

      // STEP 6: Update purchase header
      db.prepare(`
        UPDATE purchases SET
          supplier_id = ?,
          invoice_number = ?,
          purchase_date = ?,
          total_amount = ?,
          cgst_total = ?,
          sgst_total = ?,
          rounding_off = ?,
          discount = ?
        WHERE id = ?
      `).run(
        updatedPurchase.supplier_id,
        updatedPurchase.invoice_number,
        updatedPurchase.purchase_date,
        updatedPurchase.total_amount,
        updatedPurchase.cgst_total,
        updatedPurchase.sgst_total,
        updatedPurchase.rounding_off,
        updatedPurchase.discount || 0,
        purchaseId
      );

      // STEP 7: UPDATE existing items or INSERT new ones
      const updateStmt = db.prepare(`
        UPDATE purchase_items SET
          quantity = ?,
          unit_price = ?,
          gst_percentage = ?,
          cgst_amount = ?,
          sgst_amount = ?,
          total_price = ?,
          discount = ?
        WHERE purchase_id = ? AND item_id = ?
      `);

      const insertStmt = db.prepare(`
        INSERT INTO purchase_items
          (purchase_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, total_price, discount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Update last_supplier and last_purchase_date
      const updateLastPurchaseInfoStmt = db.prepare(`
        UPDATE items 
        SET last_supplier_id = ?, last_purchase_date = ? 
        WHERE id = ?
      `);

      // Only update purchase_rate if this purchase date is >= the item's current last_purchase_date
      const updatePurchaseRateStmt = db.prepare(`
        UPDATE items 
        SET purchase_rate = ? 
        WHERE id = ? 
        AND (last_purchase_date IS NULL OR ? >= last_purchase_date)
      `);

      updatedPurchase.items.forEach((item) => {
        const oldItem = oldMap.get(item.id);
        
        if (oldItem) {
          updateStmt.run(
            item.quantity,
            item.unit_price,
            item.gst_percentage || 0,
            item.cgst_amount || 0,
            item.sgst_amount || 0,
            item.total_price,
            item.discount || 0,
            purchaseId,
            item.id
          );
        } else {
          insertStmt.run(
            purchaseId,
            item.id,
            item.quantity,
            item.unit_price,
            item.gst_percentage || 0,
            item.cgst_amount || 0,
            item.sgst_amount || 0,
            item.total_price,
            item.discount || 0
          );
        }
        
        // Update last purchase info
        updateLastPurchaseInfoStmt.run(
          updatedPurchase.supplier_id, 
          updatedPurchase.purchase_date, 
          item.id
        );

        // Only update purchase_rate if this is the latest or equal purchase date
        updatePurchaseRateStmt.run(
          item.unit_price, 
          item.id, 
          updatedPurchase.purchase_date
        );
      });

      // STEP 8: Soft delete removed items
      for (const oldItem of oldItems) {
        if (!newMap.has(oldItem.item_id)) {
          db.prepare('UPDATE purchase_items SET status_code = 1 WHERE id = ?').run(oldItem.id);
        }
      }

      db.prepare('COMMIT').run();
      
      //console.log(`Purchase ${purchaseId} updated. Will recalculate ${salesToRecalculate.size} affected sales.`);
      
      return { success: true, salesToRecalculate: Array.from(salesToRecalculate) };
      
    } catch (error) {
      try {
        db.prepare('ROLLBACK').run();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
      
      console.error('Update purchase error:', error);
      throw error;
    }
  });

  ipcMain.handle('check-purchase-edit-stock', async (event, purchaseId, updatedItems) => {
    const db = getDb();
    const oldItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
    const oldMap = {};
    oldItems.forEach((item) => {
      oldMap[item.item_id] = item;
    });
    const newMap = {};
    updatedItems.forEach((item) => {
      newMap[item.id] = item;
    });

    for (const oldItem of oldItems) {
      const newItem = newMap[oldItem.item_id];
      const itemInfo = db
        .prepare('SELECT name, current_stock FROM items WHERE id = ?')
        .get(oldItem.item_id);
      const itemName = itemInfo?.name || `ID ${oldItem.item_id}`;
      const stock = itemInfo?.current_stock || 0;

      if (!newItem) {
        if (stock - oldItem.quantity < 0) {
          return { ok: false, message: `Stock for "${itemName}" will go negative.` };
        }
      } else if (newItem.quantity !== oldItem.quantity) {
        const diff = newItem.quantity - oldItem.quantity;
        if (stock + diff < 0) {
          return { ok: false, message: `Stock for "${itemName}" will go negative.` };
        }
      }
    }

    for (const newItem of updatedItems) {
      if (!oldMap[newItem.id]) {
        const itemInfo = db
          .prepare('SELECT name, current_stock FROM items WHERE id = ? ')
          .get(newItem.id);
        const itemName = itemInfo?.name || `ID ${newItem.id}`;
        const stock = itemInfo?.current_stock || 0;
        if (stock + newItem.quantity < 0) {
          return { ok: false, message: `Stock for "${itemName}" will go negative.` };
        }
      }
    }
    return { ok: true };
  });

  ipcMain.handle('check-purchase-delete-stock', async (event, purchaseId) => {
    const db = getDb();
    const items = db.prepare(
      'SELECT item_id, quantity,items.name FROM purchase_items inner join items on items.id = purchase_items.item_id WHERE purchase_id = ? AND (purchase_items.status_code = 0 OR purchase_items.status_code IS NULL) '
    ).all(purchaseId);
    for (const item of items) {
      const stock = db
        .prepare('SELECT current_stock FROM items WHERE id = ?')
        .get(item.item_id)?.current_stock || 0;
      if (stock - item.quantity < 0) {
        return {
          ok: false,
          message: `Cannot delete purchase: Inventory for item ${item.name} will go negative.`
        };
      }
      if (stock - item.quantity === 0) {
        return {
          ok: false,
          message: `Cannot delete purchase: Inventory for item ${item.name} will become zero.`
        };
      }
    }
    return { ok: true };
  });

  ipcMain.handle('generate-purchase-order-pdf', async (event, orderData) => {
    return { success: true, orderData };
  });
}


