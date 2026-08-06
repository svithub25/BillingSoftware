export function registerPurchaseHandlers({ ipcMain, getDb }) {
  const getBatchByPurchaseItemId = (db, purchaseItemId) =>
    db
      .prepare("SELECT * FROM item_batches WHERE purchase_item_id = ?")
      .get(purchaseItemId);

  const getSoldQtyForBatch = (batchRow) => {
    if (!batchRow) return 0;
    const received = parseFloat(batchRow.qty_received) || 0;
    const available = parseFloat(batchRow.qty_available) || 0;
    return Math.max(0, received - available);
  };

  ipcMain.handle(
    "save-purchase",
    async (
      event,
      {
        contact_id,
        invoice_number,
        purchase_date,
        items,
        total_amount,
        cgst_total,
        sgst_total,
        rounding_off,
        discount,
      },
    ) => {
      const db = getDb();
      const purchaseStmt = db.prepare(
        "INSERT INTO purchases (contact_id, invoice_number, purchase_date, total_amount, cgst_total, sgst_total, rounding_off, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const purchaseResult = purchaseStmt.run(
        contact_id,
        invoice_number,
        purchase_date,
        total_amount,
        cgst_total,
        sgst_total,
        rounding_off,
        discount,
      );
      const purchaseId = purchaseResult.lastInsertRowid;

      const purchaseItemStmt = db.prepare(
        "INSERT INTO purchase_items (purchase_id, item_id, quantity, unit_price, gst_percentage, cgst_amount, sgst_amount, total_price, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const updateItemStmt = db.prepare(
        "UPDATE items SET current_stock = current_stock + ?, last_contact_id = ?, last_purchase_date = ? WHERE id = ?",
      );
      // Only update purchase_rate if this is the latest purchase for this item
      const updatePurchaseRateStmt = db.prepare(`
        UPDATE items 
        SET purchase_rate = ? 
        WHERE id = ? 
        AND (last_purchase_date IS NULL OR last_purchase_date <= ?)
      `);

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
          item.discount || 0,
        );
        const purchaseItemId = purchaseItemResult.lastInsertRowid;

        // Update stock and last purchase info
        updateItemStmt.run(item.quantity, contact_id, purchase_date, item.id);

        // Only update purchase_rate if this purchase is the latest or newer
        updatePurchaseRateStmt.run(item.unit_price, item.id, purchase_date);

        // Add stock to default godown location
        updateLocationStockStmt.run(
          item.id,
          defaultGodownId,
          item.quantity,
          item.quantity,
        );

        // Insert batch info for each item row
        db.prepare(
          `
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
        `,
        ).run(
          item.id,
          purchaseItemId,
          item.batch_number || "",
          item.mfg_date || null,
          item.exp_date || null,
          item.quantity,
          item.quantity, // qty_available = qty_received at purchase
          item.unit_price,
          item.mrp || 0,
        );
      });

      // ---------------------------------------------------------
      // Unified Accounting: Record the Purchase Transaction
      // ---------------------------------------------------------
      if (contact_id) {
        // 1. Insert Transaction (Voucher)
        const txnResult = db
          .prepare(
            `
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, contact_id)
          VALUES (?, 'purchase', ?, ?, ?)
        `,
          )
          .run(
            purchase_date,
            parseInt(purchaseId),
            parseInt(purchaseId) || "",
            contact_id,
          );
        const txnId = txnResult.lastInsertRowid;

        // 2. Insert Transaction Lines (Double Entry)
        // Debit: Purchase Accounts (account_group_id = 20)
        // Credit: Supplier (contact_id)

        const insertLineStmt = db.prepare(`
          INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertLineStmt.run(txnId, "account_group", 20, total_amount, 0); // Debit Leg
        insertLineStmt.run(txnId, "contact", contact_id, 0, total_amount); // Credit Leg

        // 3. Update Contact Balance (Credit -> Subtract)
        db.prepare(
          "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
        ).run(total_amount, contact_id);
      }

      return { success: true, purchaseId };
    },
  );

  ipcMain.handle("get-purchase-history", async () => {
    return getDb()
      .prepare(
        `
      SELECT p.*, c.name as supplier_name
      FROM purchases p
      LEFT JOIN contacts c ON p.contact_id = c.id
      WHERE (p.status_code = 0 OR p.status_code IS NULL)
      ORDER BY p.purchase_date DESC
    `,
      )
      .all();
  });

  ipcMain.handle("get-purchase-details", async (event, purchaseId) => {
    const db = getDb();
    const purchase = db
      .prepare(
        `
      SELECT
        p.*,
        c.name as supplier_name,
        c.phone as supplier_contact,
        c.address as supplier_address,
        c.gstin as supplier_gstin
      FROM purchases p
      LEFT JOIN contacts c ON p.contact_id = c.id
      WHERE p.id = ?
    `,
      )
      .get(purchaseId);

    const items = db
      .prepare(
        `
      SELECT pi.*, i.name as item_name, i.sku, i.hsn_code, i.unit, i.current_stock,
             (SELECT COALESCE(SUM(return_quantity), 0) 
              FROM credit_debit_note_items cdni 
              JOIN credit_debit_notes cdn ON cdn.id = cdni.note_id
              WHERE cdni.original_purchase_item_id = pi.id AND cdn.status_code = 0) as already_returned
      FROM purchase_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.purchase_id = ?
    `,
      )
      .all(purchaseId);

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
        gst_total,
      },
    };
  });

  ipcMain.handle("get-purchase-full-details", async (event, purchaseId) => {
    const db = getDb();
    const purchase = db
      .prepare(
        `
      SELECT p.*, c.name as supplier_name, c.phone as supplier_contact, c.address as supplier_address, c.gstin as supplier_gstin
      FROM purchases p
      LEFT JOIN contacts c ON p.contact_id = c.id
      WHERE p.id = ?
    `,
      )
      .get(purchaseId);

    const items = db
      .prepare(
        `
      SELECT pi.*, i.name as item_name, i.sku, i.hsn_code, i.unit
      FROM purchase_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.purchase_id = ?
    `,
      )
      .all(purchaseId);

    return { ...purchase, items };
  });

  ipcMain.handle("delete-purchase", async (event, purchaseId) => {
    const db = getDb();
    const purchaseItems = db
      .prepare(
        "SELECT id, item_id, quantity FROM purchase_items WHERE purchase_id = ? AND (status_code = 0 OR status_code IS NULL)",
      )
      .all(purchaseId);

    // Get default godown ID
    const defaultGodown = db
      .prepare("SELECT id FROM godowns WHERE is_default = 1 LIMIT 1")
      .get();
    const defaultGodownId = defaultGodown?.id;

    // Do not allow deleting purchases whose batches were already consumed by sales.
    for (const item of purchaseItems) {
      const batchRow = getBatchByPurchaseItemId(db, item.id);
      const soldQty = getSoldQtyForBatch(batchRow);
      if (soldQty > 0) {
        return {
          success: false,
          message: `Cannot delete purchase: batch stock for item ID ${item.item_id} is already used in sales.`,
        };
      }
    }

    for (const item of purchaseItems) {
      const stock =
        db
          .prepare("SELECT current_stock FROM items WHERE id = ?")
          .get(item.item_id)?.current_stock || 0;
      if (stock - item.quantity < 0) {
        return {
          success: false,
          message: `Cannot delete purchase: Stock for item ID ${item.item_id} will go negative.`,
        };
      }
    }

    db.prepare("BEGIN TRANSACTION").run();
    try {
      purchaseItems.forEach((item) => {
        // Update global stock
        db.prepare(
          "UPDATE items SET current_stock = current_stock - ? WHERE id = ?",
        ).run(item.quantity, item.item_id);

        // Update location stock if default godown exists
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
          ).run(item.item_id, defaultGodownId, -item.quantity, -item.quantity);
        }

        // Keep batch table in sync for deleted purchase rows.
        db.prepare(
          "UPDATE item_batches SET qty_received = 0, qty_available = 0 WHERE purchase_item_id = ?",
        ).run(item.id);
      });

      const purchaseInfo = db
        .prepare(
          "SELECT contact_id, invoice_number FROM purchases WHERE id = ?",
        )
        .get(purchaseId);

      db.prepare("UPDATE purchases SET status_code = 1 WHERE id = ?").run(
        purchaseId,
      );
      db.prepare(
        "UPDATE purchase_items SET status_code = 1 WHERE purchase_id = ?",
      ).run(purchaseId);

      // ---------------------------------------------------------
      // Unified Accounting: Soft Delete Purchase Transaction
      // ---------------------------------------------------------
      const transaction = db
        .prepare(
          "SELECT id FROM transactions WHERE reference_no = ? AND voucher_type = ?",
        )
        .get(purchaseInfo.invoice_number, "purchase");
      if (transaction && purchaseInfo?.contact_id) {
        const creditLine = db
          .prepare(
            "SELECT credit FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'contact' AND ledger_id = ?",
          )
          .get(transaction.id, purchaseInfo.contact_id);
        if (creditLine && creditLine.credit > 0) {
          // Reverse the credit to supplier by adding it back
          db.prepare(
            "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
          ).run(creditLine.credit, purchaseInfo.contact_id);
        }
        db.prepare("UPDATE transactions SET is_deleted = 1 WHERE id = ?").run(
          transaction.id,
        );
      }

      db.prepare("COMMIT").run();
    } catch (error) {
      try {
        db.prepare("ROLLBACK").run();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
      throw error;
    }

    return { success: true };
  });

  ipcMain.handle(
    "update-purchase",
    async (event, purchaseId, updatedPurchase) => {
      const db = getDb();

      try {
        db.prepare("BEGIN TRANSACTION").run();

        // Get old purchase items
        const oldItems = db
          .prepare(
            "SELECT * FROM purchase_items WHERE purchase_id = ? AND (status_code = 0 OR status_code IS NULL)",
          )
          .all(purchaseId);
        const oldPurchaseItemIds = oldItems.map((item) => item.id);

        // Get the purchase date and contact to know which sales to recalculate and to update accounting
        const purchaseInfo = db
          .prepare(
            "SELECT purchase_date, contact_id, invoice_number FROM purchases WHERE id = ?",
          )
          .get(purchaseId);

        // STEP 1: Delete all cost allocations related to this purchase
        if (oldPurchaseItemIds.length > 0) {
          const placeholders = oldPurchaseItemIds.map(() => "?").join(",");
          db.prepare(
            `
          DELETE FROM sale_item_cost_allocation 
          WHERE purchase_item_id IN (${placeholders})
        `,
          ).run(...oldPurchaseItemIds);
        }

        // STEP 2: Get all affected item IDs
        const affectedItemIds = [
          ...new Set([
            ...oldItems.map((item) => item.item_id),
            ...updatedPurchase.items.map((item) => item.id),
          ]),
        ];

        // STEP 3: Get all sales of affected items after this purchase date that need recalculation
        const salesToRecalculate = new Set();
        for (const itemId of affectedItemIds) {
          const sales = db
            .prepare(
              `
          SELECT DISTINCT si.sale_id
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE si.item_id = ?
          AND s.sale_date >= ?
          AND (s.status_code = 0 OR s.status_code IS NULL)
          AND (si.status_code = 0 OR si.status_code IS NULL)
        `,
            )
            .all(itemId, purchaseInfo.purchase_date);

          sales.forEach((sale) => salesToRecalculate.add(sale.sale_id));
        }

        // STEP 4: Delete all cost allocations for sales that need recalculation
        for (const saleId of salesToRecalculate) {
          db.prepare(
            `
          DELETE FROM sale_item_cost_allocation 
          WHERE sale_item_id IN (
            SELECT id FROM sale_items WHERE sale_id = ?
          )
        `,
          ).run(saleId);
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
            db.prepare(
              "UPDATE items SET current_stock = current_stock - ? WHERE id = ?",
            ).run(oldItem.quantity, oldItem.item_id);
          } else if (newItem.quantity !== oldItem.quantity) {
            // Quantity changed
            db.prepare(
              "UPDATE items SET current_stock = current_stock + ? WHERE id = ?",
            ).run(newItem.quantity - oldItem.quantity, oldItem.item_id);
          }
        }

        for (const newItem of updatedPurchase.items) {
          if (!oldMap.has(newItem.id)) {
            // New item added
            db.prepare(
              "UPDATE items SET current_stock = current_stock + ? WHERE id = ?",
            ).run(newItem.quantity, newItem.id);
          }
        }

        // STEP 6: Update purchase header
        db.prepare(
          `
        UPDATE purchases SET
          contact_id = ?,
          invoice_number = ?,
          purchase_date = ?,
          total_amount = ?,
          cgst_total = ?,
          sgst_total = ?,
          rounding_off = ?,
          discount = ?
        WHERE id = ?
      `,
        ).run(
          updatedPurchase.contact_id,
          updatedPurchase.invoice_number,
          updatedPurchase.purchase_date,
          updatedPurchase.total_amount,
          updatedPurchase.cgst_total,
          updatedPurchase.sgst_total,
          updatedPurchase.rounding_off,
          updatedPurchase.discount || 0,
          purchaseId,
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

        const insertBatchStmt = db.prepare(`
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
      `);

        const updateBatchStmt = db.prepare(`
        UPDATE item_batches
        SET
          batch_number = ?,
          mfg_date = ?,
          exp_date = ?,
          qty_received = ?,
          qty_available = ?,
          purchase_rate = ?,
          mrp = ?
        WHERE purchase_item_id = ?
      `);

        // Update last_contact and last_purchase_date
        const updateLastPurchaseInfoStmt = db.prepare(`
        UPDATE items 
        SET last_contact_id = ?, last_purchase_date = ? 
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
          const nextQty = parseFloat(item.quantity) || 0;
          const nextRate = parseFloat(item.unit_price) || 0;
          const nextMrp = parseFloat(item.mrp) || 0;

          if (oldItem) {
            updateStmt.run(
              nextQty,
              nextRate,
              item.gst_percentage || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.total_price,
              item.discount || 0,
              purchaseId,
              item.id,
            );

            // Keep corresponding batch row aligned with edited purchase item.
            const batchRow = getBatchByPurchaseItemId(db, oldItem.id);
            const soldQty = getSoldQtyForBatch(batchRow);
            if (nextQty < soldQty) {
              throw new Error(
                `Cannot reduce quantity below already sold qty (${soldQty}) for item ID ${item.id}`,
              );
            }

            if (batchRow) {
              updateBatchStmt.run(
                item.batch_number || batchRow.batch_number || "",
                item.mfg_date || batchRow.mfg_date || null,
                item.exp_date || batchRow.exp_date || null,
                nextQty,
                nextQty - soldQty,
                nextRate,
                nextMrp || batchRow.mrp || 0,
                oldItem.id,
              );
            } else {
              insertBatchStmt.run(
                item.id,
                oldItem.id,
                item.batch_number || "",
                item.mfg_date || null,
                item.exp_date || null,
                nextQty,
                nextQty,
                nextRate,
                nextMrp,
              );
            }
          } else {
            const purchaseItemInsert = insertStmt.run(
              purchaseId,
              item.id,
              nextQty,
              nextRate,
              item.gst_percentage || 0,
              item.cgst_amount || 0,
              item.sgst_amount || 0,
              item.total_price,
              item.discount || 0,
            );

            insertBatchStmt.run(
              item.id,
              purchaseItemInsert.lastInsertRowid,
              item.batch_number || "",
              item.mfg_date || null,
              item.exp_date || null,
              nextQty,
              nextQty,
              nextRate,
              nextMrp,
            );
          }

          // Update last purchase info
          updateLastPurchaseInfoStmt.run(
            updatedPurchase.contact_id,
            updatedPurchase.purchase_date,
            item.id,
          );

          // Only update purchase_rate if this is the latest or equal purchase date
          updatePurchaseRateStmt.run(
            nextRate,
            item.id,
            updatedPurchase.purchase_date,
          );
        });

        // STEP 8: Soft delete removed items
        for (const oldItem of oldItems) {
          if (!newMap.has(oldItem.item_id)) {
            const batchRow = getBatchByPurchaseItemId(db, oldItem.id);
            const soldQty = getSoldQtyForBatch(batchRow);
            if (soldQty > 0) {
              throw new Error(
                `Cannot remove item ID ${oldItem.item_id}: batch already used in sales.`,
              );
            }

            db.prepare(
              "UPDATE purchase_items SET status_code = 1 WHERE id = ?",
            ).run(oldItem.id);
            db.prepare(
              "UPDATE item_batches SET qty_received = 0, qty_available = 0 WHERE purchase_item_id = ?",
            ).run(oldItem.id);
          }
        }

        // ---------------------------------------------------------
        // Unified Accounting: Update Purchase Transaction
        // ---------------------------------------------------------
        if (updatedPurchase.contact_id) {
          const transaction = db
            .prepare(
              "SELECT id FROM transactions WHERE reference_no = ? AND voucher_type = ?",
            )
            .get(purchaseInfo.invoice_number, "purchase");
          const newTotalAmount = updatedPurchase.total_amount || 0;

          if (transaction) {
            // Revert old contact balance first
            if (purchaseInfo.contact_id) {
              const creditLine = db
                .prepare(
                  "SELECT credit FROM transaction_lines WHERE transaction_id = ? AND ledger_type = 'contact' AND ledger_id = ?",
                )
                .get(transaction.id, purchaseInfo.contact_id);
              if (creditLine && creditLine.credit > 0) {
                db.prepare(
                  "UPDATE contacts SET current_balance = current_balance + ? WHERE id = ?",
                ).run(creditLine.credit, purchaseInfo.contact_id);
              }
            }

            // Delete old transaction lines
            db.prepare(
              "DELETE FROM transaction_lines WHERE transaction_id = ?",
            ).run(transaction.id);

            // Update transaction header
            db.prepare(
              "UPDATE transactions SET amount = ?, contact_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            ).run(newTotalAmount, updatedPurchase.contact_id, transaction.id);

            // Insert new lines
            const insertLineStmt = db.prepare(
              "INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit) VALUES (?, ?, ?, ?, ?)",
            );
            insertLineStmt.run(
              transaction.id,
              "account_group",
              20,
              newTotalAmount,
              0,
            ); // Dr Purchase Accounts
            insertLineStmt.run(
              transaction.id,
              "contact",
              updatedPurchase.contact_id,
              0,
              newTotalAmount,
            ); // Cr Supplier

            // Apply new contact balance
            db.prepare(
              "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
            ).run(newTotalAmount, updatedPurchase.contact_id);
          } else {
            // Create transaction if it didn't exist for some reason
            const txnResult = db
              .prepare(
                "INSERT INTO transactions (transaction_date, voucher_type, voucher_no, reference_no, contact_id, amount) VALUES (?, 'purchase', ?, ?, ?, ?)",
              )
              .run(
                updatedPurchase.purchase_date,
                updatedPurchase.invoice_number,
                updatedPurchase.invoice_number,
                updatedPurchase.contact_id,
                newTotalAmount,
              );
            const txnId = txnResult.lastInsertRowid;
            const insertLineStmt = db.prepare(
              "INSERT INTO transaction_lines (transaction_id, ledger_type, ledger_id, debit, credit) VALUES (?, ?, ?, ?, ?)",
            );
            insertLineStmt.run(txnId, "account_group", 20, newTotalAmount, 0); // Dr
            insertLineStmt.run(
              txnId,
              "contact",
              updatedPurchase.contact_id,
              0,
              newTotalAmount,
            ); // Cr
            db.prepare(
              "UPDATE contacts SET current_balance = current_balance - ? WHERE id = ?",
            ).run(newTotalAmount, updatedPurchase.contact_id);
          }
        }

        db.prepare("COMMIT").run();

        //console.log(`Purchase ${purchaseId} updated. Will recalculate ${salesToRecalculate.size} affected sales.`);

        return {
          success: true,
          salesToRecalculate: Array.from(salesToRecalculate),
        };
      } catch (error) {
        try {
          db.prepare("ROLLBACK").run();
        } catch (rollbackError) {
          console.error("Rollback error:", rollbackError);
        }

        console.error("Update purchase error:", error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    "check-purchase-edit-stock",
    async (event, purchaseId, updatedItems) => {
      const db = getDb();
      const oldItems = db
        .prepare(
          "SELECT * FROM purchase_items WHERE purchase_id = ? AND (status_code = 0 OR status_code IS NULL)",
        )
        .all(purchaseId);
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
          .prepare("SELECT name, current_stock FROM items WHERE id = ?")
          .get(oldItem.item_id);
        const itemName = itemInfo?.name || `ID ${oldItem.item_id}`;
        const stock = itemInfo?.current_stock || 0;

        if (!newItem) {
          if (stock - oldItem.quantity < 0) {
            return {
              ok: false,
              message: `Stock for "${itemName}" will go negative.`,
            };
          }
        } else if (newItem.quantity !== oldItem.quantity) {
          const diff = newItem.quantity - oldItem.quantity;
          if (stock + diff < 0) {
            return {
              ok: false,
              message: `Stock for "${itemName}" will go negative.`,
            };
          }
        }
      }

      for (const newItem of updatedItems) {
        if (!oldMap[newItem.id]) {
          const itemInfo = db
            .prepare("SELECT name, current_stock FROM items WHERE id = ? ")
            .get(newItem.id);
          const itemName = itemInfo?.name || `ID ${newItem.id}`;
          const stock = itemInfo?.current_stock || 0;
          if (stock + newItem.quantity < 0) {
            return {
              ok: false,
              message: `Stock for "${itemName}" will go negative.`,
            };
          }
        }
      }

      // Batch-level safety: edited quantity cannot be lower than already sold qty from its batch.
      for (const oldItem of oldItems) {
        const nextItem = newMap[oldItem.item_id];
        const batchRow = getBatchByPurchaseItemId(db, oldItem.id);
        const soldQty = getSoldQtyForBatch(batchRow);

        if (!nextItem && soldQty > 0) {
          return {
            ok: false,
            message: `Cannot remove item ID ${oldItem.item_id}: quantity already consumed from its batch.`,
          };
        }

        if (nextItem && (parseFloat(nextItem.quantity) || 0) < soldQty) {
          return {
            ok: false,
            message: `Cannot reduce item ID ${oldItem.item_id} below sold batch qty (${soldQty}).`,
          };
        }
      }

      return { ok: true };
    },
  );

  ipcMain.handle("check-purchase-delete-stock", async (event, purchaseId) => {
    const db = getDb();
    const items = db
      .prepare(
        "SELECT purchase_items.id, item_id, quantity,items.name FROM purchase_items inner join items on items.id = purchase_items.item_id WHERE purchase_id = ? AND (purchase_items.status_code = 0 OR purchase_items.status_code IS NULL) ",
      )
      .all(purchaseId);
    for (const item of items) {
      const batchRow = getBatchByPurchaseItemId(db, item.id);
      const soldQty = getSoldQtyForBatch(batchRow);
      if (soldQty > 0) {
        return {
          ok: false,
          message: `Cannot delete purchase: batch for item ${item.name} is already used in sales.`,
        };
      }

      const stock =
        db
          .prepare("SELECT current_stock FROM items WHERE id = ?")
          .get(item.item_id)?.current_stock || 0;
      if (stock - item.quantity < 0) {
        return {
          ok: false,
          message: `Cannot delete purchase: Inventory for item ${item.name} will go negative.`,
        };
      }
      if (stock - item.quantity === 0) {
        return {
          ok: false,
          message: `Cannot delete purchase: Inventory for item ${item.name} will become zero.`,
        };
      }
    }
    return { ok: true };
  });

  ipcMain.handle("generate-purchase-order-pdf", async (event, orderData) => {
    return { success: true, orderData };
  });

  ipcMain.handle("get-pending-purchases", async (event, contactId) => {
    return getDb()
      .prepare(
        `
      SELECT id, invoice_number, purchase_date, total_amount, paid_amount, payment_status
      FROM purchases
      WHERE contact_id = ? 
        AND payment_status != 'paid' 
        AND (status_code = 0 OR status_code IS NULL)
      ORDER BY purchase_date ASC
    `,
      )
      .all(contactId);
  });
}
