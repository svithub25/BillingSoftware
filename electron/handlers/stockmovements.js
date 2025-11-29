/**
 * Stock Movements and Godown/Branch Management Handlers
 * Handles all operations related to stock transfers, godown management, and location-based inventory
 */

export function registerStockMovementHandlers({ ipcMain, getDb }) {

  // ============================================
  // GODOWN/BRANCH MASTER CRUD
  // ============================================

  /**
   * Get all active godowns/branches
   */
  ipcMain.handle('get-godowns', async () => {
    try {
      const db = getDb();
      const godowns = db.prepare(`
        SELECT * FROM godowns
        WHERE status_code = 0
        ORDER BY is_default DESC, name ASC
      `).all();

      return { success: true, data: godowns };
    } catch (error) {
      console.error('Error fetching godowns:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get active godowns only (for dropdowns)
   */
  ipcMain.handle('get-active-godowns', async () => {
    try {
      const db = getDb();
      const godowns = db.prepare(`
        SELECT id, name, code, location_type, city
        FROM godowns
        WHERE status_code = 0 AND is_active = 1
        ORDER BY is_default DESC, name ASC
      `).all();

      return { success: true, data: godowns };
    } catch (error) {
      console.error('Error fetching active godowns:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Add new godown/branch
   */
  ipcMain.handle('add-godown', async (event, godownData) => {
    try {
      const db = getDb();

      // Check if code already exists
      const existing = db.prepare('SELECT id FROM godowns WHERE code = ? AND status_code = 0').get(godownData.code);
      if (existing) {
        return { success: false, error: 'Godown code already exists' };
      }

      const result = db.prepare(`
        INSERT INTO godowns (
          name, code, location_type, address, city, state, pincode,
          contact_person, contact_number, email, is_active, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        godownData.name,
        godownData.code,
        godownData.location_type || 'godown',
        godownData.address || '',
        godownData.city || '',
        godownData.state || '',
        godownData.pincode || '',
        godownData.contact_person || '',
        godownData.contact_number || '',
        godownData.email || '',
        godownData.is_active !== undefined ? godownData.is_active : 1,
        godownData.remarks || ''
      );

      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding godown:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update godown/branch
   */
  ipcMain.handle('update-godown', async (event, godownId, godownData) => {
    try {
      const db = getDb();

      // Check if code already exists for other godowns
      const existing = db.prepare(
        'SELECT id FROM godowns WHERE code = ? AND id != ? AND status_code = 0'
      ).get(godownData.code, godownId);

      if (existing) {
        return { success: false, error: 'Godown code already exists' };
      }

      db.prepare(`
        UPDATE godowns SET
          name = ?, code = ?, location_type = ?, address = ?, city = ?,
          state = ?, pincode = ?, contact_person = ?, contact_number = ?,
          email = ?, is_active = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        godownData.name,
        godownData.code,
        godownData.location_type,
        godownData.address || '',
        godownData.city || '',
        godownData.state || '',
        godownData.pincode || '',
        godownData.contact_person || '',
        godownData.contact_number || '',
        godownData.email || '',
        godownData.is_active,
        godownData.remarks || '',
        godownId
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating godown:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete godown/branch (soft delete)
   */
  ipcMain.handle('delete-godown', async (event, godownId) => {
    try {
      const db = getDb();

      // Check if it's the default godown
      const godown = db.prepare('SELECT is_default FROM godowns WHERE id = ?').get(godownId);
      if (godown && godown.is_default === 1) {
        return { success: false, error: 'Cannot delete the default godown' };
      }

      // Check if there are any stock movements for this godown
      const movements = db.prepare(`
        SELECT COUNT(*) as count FROM stock_movements
        WHERE (from_godown_id = ? OR to_godown_id = ?) AND status_code = 0
      `).get(godownId, godownId);

      if (movements.count > 0) {
        return { success: false, error: 'Cannot delete godown with existing stock movements' };
      }

      db.prepare('UPDATE godowns SET status_code = 1 WHERE id = ?').run(godownId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting godown:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // STOCK MOVEMENT NUMBER GENERATION
  // ============================================

  /**
   * Generate next movement number
   */
  ipcMain.handle('generate-movement-number', async (event, category = 'transfer') => {
    try {
      const db = getDb();

      const prefix = category === 'transfer' ? 'TRF' :
                     category === 'adjustment_in' ? 'ADJ-IN' :
                     category === 'adjustment_out' ? 'ADJ-OUT' : 'MOV';

      const lastMovement = db.prepare(`
        SELECT movement_number FROM stock_movements
        WHERE movement_number LIKE ?
        ORDER BY id DESC LIMIT 1
      `).get(`${prefix}-%`);

      let nextNumber = 1;
      if (lastMovement) {
        const match = lastMovement.movement_number.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const movementNumber = `${prefix}-${String(nextNumber).padStart(6, '0')}`;
      return { success: true, movementNumber };
    } catch (error) {
      console.error('Error generating movement number:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // STOCK MOVEMENT CRUD
  // ============================================

  /**
   * Create stock movement (transfer/adjustment)
   */
  ipcMain.handle('create-stock-movement', async (event, movementData) => {
    const db = getDb();

    const transaction = db.transaction(() => {
      try {
        // Insert movement header
        const movementResult = db.prepare(`
          INSERT INTO stock_movements (
            movement_number, movement_date, movement_category,
            from_godown_id, to_godown_id,
            movement_status, transport_mode, vehicle_number,
            driver_name, driver_contact, lr_number, transporter_name,
            freight_charges, e_way_bill_number, reason, dispatch_notes,
            total_quantity, total_value, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          movementData.movement_number,
          movementData.movement_date,
          movementData.movement_category,
          movementData.from_godown_id || null,
          movementData.to_godown_id || null,
          movementData.movement_status || 'draft',
          movementData.transport_mode || null,
          movementData.vehicle_number || null,
          movementData.driver_name || null,
          movementData.driver_contact || null,
          movementData.lr_number || null,
          movementData.transporter_name || null,
          movementData.freight_charges || 0,
          movementData.e_way_bill_number || null,
          movementData.reason || null,
          movementData.dispatch_notes || null,
          movementData.total_quantity || 0,
          movementData.total_value || 0,
          movementData.created_by || null
        );

        const movementId = movementResult.lastInsertRowid;

        // Insert movement items
        const itemStmt = db.prepare(`
          INSERT INTO stock_movement_items (
            movement_id, item_id, planned_quantity, dispatched_quantity,
            batch_number, unit_rate, total_value, condition_on_dispatch, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of movementData.items) {
          itemStmt.run(
            movementId,
            item.item_id,
            item.quantity,
            item.quantity, // dispatched = planned initially
            item.batch_number || null,
            item.unit_rate || 0,
            item.total_value || 0,
            item.condition || 'good',
            item.remarks || null
          );
        }

        // If status is 'completed', update stock immediately
        if (movementData.movement_status === 'completed') {
          updateStockForMovement(db, movementId, movementData);
        }

        return { success: true, id: movementId };
      } catch (error) {
        console.error('Error in transaction:', error);
        throw error;
      }
    });

    try {
      const result = transaction();
      return result;
    } catch (error) {
      console.error('Error creating stock movement:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get all stock movements with filters
   */
  ipcMain.handle('get-stock-movements', async (event, filters = {}) => {
    try {
      const db = getDb();

      let query = `
        SELECT
          sm.*,
          g1.name as from_godown_name,
          g2.name as to_godown_name
        FROM stock_movements sm
        LEFT JOIN godowns g1 ON sm.from_godown_id = g1.id
        LEFT JOIN godowns g2 ON sm.to_godown_id = g2.id
        WHERE sm.status_code = 0
      `;

      const params = [];

      if (filters.category) {
        query += ' AND sm.movement_category = ?';
        params.push(filters.category);
      }

      if (filters.status) {
        query += ' AND sm.movement_status = ?';
        params.push(filters.status);
      }

      if (filters.from_godown_id) {
        query += ' AND sm.from_godown_id = ?';
        params.push(filters.from_godown_id);
      }

      if (filters.to_godown_id) {
        query += ' AND sm.to_godown_id = ?';
        params.push(filters.to_godown_id);
      }

      if (filters.start_date) {
        query += ' AND sm.movement_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND sm.movement_date <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY sm.movement_date DESC, sm.id DESC';

      const movements = db.prepare(query).all(...params);

      return { success: true, data: movements };
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get stock movement details with items
   */
  ipcMain.handle('get-stock-movement-details', async (event, movementId) => {
    try {
      const db = getDb();

      const movement = db.prepare(`
        SELECT
          sm.*,
          g1.name as from_godown_name,
          g1.code as from_godown_code,
          g2.name as to_godown_name,
          g2.code as to_godown_code
        FROM stock_movements sm
        LEFT JOIN godowns g1 ON sm.from_godown_id = g1.id
        LEFT JOIN godowns g2 ON sm.to_godown_id = g2.id
        WHERE sm.id = ?
      `).get(movementId);

      if (!movement) {
        return { success: false, error: 'Movement not found' };
      }

      const items = db.prepare(`
        SELECT
          smi.*,
          i.name as item_name,
          i.sku,
          i.unit
        FROM stock_movement_items smi
        JOIN items i ON smi.item_id = i.id
        WHERE smi.movement_id = ? AND smi.status_code = 0
      `).all(movementId);

      movement.items = items;

      return { success: true, data: movement };
    } catch (error) {
      console.error('Error fetching movement details:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update stock movement status
   */
  ipcMain.handle('update-movement-status', async (event, movementId, newStatus, notes = '') => {
    const db = getDb();

    const transaction = db.transaction(() => {
      try {
        const movement = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementId);

        if (!movement) {
          throw new Error('Movement not found');
        }

        const oldStatus = movement.movement_status;

        const updateData = {
          movement_status: newStatus,
          updated_at: new Date().toISOString()
        };

        // Set dates based on status
        if (newStatus === 'in_transit' && !movement.dispatch_date) {
          updateData.dispatch_date = new Date().toISOString().split('T')[0];
        }
        if (newStatus === 'completed' && !movement.received_date) {
          updateData.received_date = new Date().toISOString().split('T')[0];
        }
        if (newStatus === 'approved' && !movement.approval_date) {
          updateData.approval_date = new Date().toISOString();
          updateData.is_approved = 1;
        }

        // Update receiving notes if provided
        if (notes) {
          updateData.receiving_notes = notes;
        }

        // Build update query
        const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updateData);

        db.prepare(`UPDATE stock_movements SET ${fields} WHERE id = ?`).run(...values, movementId);

        // Handle stock updates based on status change
        const wasCompleted = oldStatus === 'completed';
        const isNowCompleted = newStatus === 'completed';

        if (wasCompleted && !isNowCompleted) {
          // Reverting from completed - reverse the stock movement
          const items = db.prepare(`
            SELECT smi.*, sm.from_godown_id, sm.to_godown_id, sm.movement_category
            FROM stock_movement_items smi
            JOIN stock_movements sm ON smi.movement_id = sm.id
            WHERE smi.movement_id = ?
          `).all(movementId);

          reverseStockForMovement(db, movement, items);
        } else if (!wasCompleted && isNowCompleted) {
          // Completing the movement - apply stock changes
          const items = db.prepare(`
            SELECT smi.*, sm.from_godown_id, sm.to_godown_id, sm.movement_category
            FROM stock_movement_items smi
            JOIN stock_movements sm ON smi.movement_id = sm.id
            WHERE smi.movement_id = ?
          `).all(movementId);

          updateStockForMovement(db, movementId, movement, items);
        }

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return result;
    } catch (error) {
      console.error('Error updating movement status:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Receive stock movement (update received quantities)
   */
  ipcMain.handle('receive-stock-movement', async (event, movementId, receivedItems, receivingNotes) => {
    const db = getDb();

    const transaction = db.transaction(() => {
      try {
        // Update received quantities for each item
        const updateItemStmt = db.prepare(`
          UPDATE stock_movement_items SET
            received_quantity = ?,
            accepted_quantity = ?,
            rejected_quantity = ?,
            damaged_quantity = ?,
            condition_on_receipt = ?,
            remarks = ?
          WHERE id = ?
        `);

        for (const item of receivedItems) {
          updateItemStmt.run(
            item.received_quantity,
            item.accepted_quantity,
            item.rejected_quantity || 0,
            item.damaged_quantity || 0,
            item.condition_on_receipt || 'good',
            item.remarks || null,
            item.id
          );
        }

        // Update movement status and received date
        db.prepare(`
          UPDATE stock_movements SET
            movement_status = ?,
            received_date = ?,
            receiving_notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run('completed', new Date().toISOString().split('T')[0], receivingNotes, movementId);

        // Get movement details for stock update
        const movement = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementId);

        // Update stock based on received quantities
        updateStockForMovement(db, movementId, movement, receivedItems);

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return result;
    } catch (error) {
      console.error('Error receiving stock movement:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete stock movement
   */
  ipcMain.handle('delete-stock-movement', async (event, movementId) => {
    const db = getDb();

    const transaction = db.transaction(() => {
      try {
        const movement = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(movementId);

        if (!movement) {
          throw new Error('Movement not found');
        }

        // If movement was completed, we need to reverse the stock changes
        if (movement.movement_status === 'completed') {
          const items = db.prepare(`
            SELECT smi.*, sm.from_godown_id, sm.to_godown_id, sm.movement_category
            FROM stock_movement_items smi
            JOIN stock_movements sm ON smi.movement_id = sm.id
            WHERE smi.movement_id = ?
          `).all(movementId);

          reverseStockForMovement(db, movement, items);
        }

        // Soft delete the movement and items
        db.prepare('UPDATE stock_movements SET status_code = 1 WHERE id = ?').run(movementId);
        db.prepare('UPDATE stock_movement_items SET status_code = 1 WHERE movement_id = ?').run(movementId);

        return { success: true };
      } catch (error) {
        throw error;
      }
    });

    try {
      const result = transaction();
      return result;
    } catch (error) {
      console.error('Error deleting stock movement:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // STOCK BY LOCATION QUERIES
  // ============================================

  /**
   * Get stock for an item across all locations
   */
  ipcMain.handle('get-item-stock-by-location', async (event, itemId) => {
    try {
      const db = getDb();

      const stockByLocation = db.prepare(`
        SELECT
          ils.*,
          g.name as godown_name,
          g.code as godown_code,
          g.location_type,
          i.name as item_name,
          i.sku,
          i.unit
        FROM item_location_stock ils
        JOIN godowns g ON ils.godown_id = g.id
        JOIN items i ON ils.item_id = i.id
        WHERE ils.item_id = ? AND g.status_code = 0 AND g.is_active = 1
        ORDER BY g.is_default DESC, g.name ASC
      `).all(itemId);

      return { success: true, data: stockByLocation };
    } catch (error) {
      console.error('Error fetching item stock by location:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get all items stock at a specific location
   */
  ipcMain.handle('get-location-stock', async (event, godownId) => {
    try {
      const db = getDb();

      const stock = db.prepare(`
        SELECT
          ils.*,
          i.name as item_name,
          i.sku,
          i.unit,
          i.mrp,
          i.sale_rate,
          c.name as category_name
        FROM item_location_stock ils
        JOIN items i ON ils.item_id = i.id
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE ils.godown_id = ? AND i.status_code = 0
        ORDER BY i.name ASC
      `).all(godownId);

      return { success: true, data: stock };
    } catch (error) {
      console.error('Error fetching location stock:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get inventory with available stock at specific location
   */
  ipcMain.handle('get-inventory-for-transfer', async (event, godownId) => {
    try {
      const db = getDb();

      const items = db.prepare(`
        SELECT
          i.*,
          COALESCE(ils.current_stock, 0) as location_stock,
          COALESCE(ils.available_stock, 0) as available_stock,
          c.name as category_name
        FROM items i
        LEFT JOIN item_location_stock ils ON i.id = ils.item_id AND ils.godown_id = ?
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.status_code = 0
        ORDER BY i.name ASC
      `).all(godownId);

      return { success: true, data: items };
    } catch (error) {
      console.error('Error fetching inventory for transfer:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Update stock for movement (helper function)
   */
  function updateStockForMovement(db, movementId, movement, items = null) {
    // If items not provided, fetch them
    if (!items) {
      items = db.prepare(`
        SELECT * FROM stock_movement_items WHERE movement_id = ? AND status_code = 0
      `).all(movementId);
    }

    // Get the default godown ID
    const defaultGodown = db.prepare('SELECT id FROM godowns WHERE is_default = 1 LIMIT 1').get();
    const defaultGodownId = defaultGodown?.id;

    const updateLocationStockStmt = db.prepare(`
      INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(item_id, godown_id) DO UPDATE SET
        current_stock = current_stock + excluded.current_stock,
        available_stock = available_stock + excluded.available_stock,
        last_movement_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

    const updateGlobalStockStmt = db.prepare(`
      UPDATE items SET current_stock = current_stock + ? WHERE id = ?
    `);

    for (const item of items) {
      const quantity = item.accepted_quantity || item.received_quantity || item.dispatched_quantity || item.planned_quantity;

      // Deduct from source location
      if (movement.from_godown_id) {
        updateLocationStockStmt.run(
          item.item_id,
          movement.from_godown_id,
          -quantity,
          -quantity
        );

        // If transferring FROM default godown, decrease global current_stock
        if (defaultGodownId && movement.from_godown_id === defaultGodownId) {
          updateGlobalStockStmt.run(-quantity, item.item_id);
        }
      }

      // Add to destination location
      if (movement.to_godown_id) {
        updateLocationStockStmt.run(
          item.item_id,
          movement.to_godown_id,
          quantity,
          quantity
        );

        // If transferring TO default godown, increase global current_stock
        if (defaultGodownId && movement.to_godown_id === defaultGodownId) {
          updateGlobalStockStmt.run(quantity, item.item_id);
        }
      }
    }
  }

  /**
   * Reverse stock for movement (helper function)
   * Used when reverting a completed movement or deleting it
   */
  function reverseStockForMovement(db, movement, items) {
    // Get the default godown ID
    const defaultGodown = db.prepare('SELECT id FROM godowns WHERE is_default = 1 LIMIT 1').get();
    const defaultGodownId = defaultGodown?.id;

    const updateLocationStockStmt = db.prepare(`
      INSERT INTO item_location_stock (item_id, godown_id, current_stock, available_stock, last_movement_date, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(item_id, godown_id) DO UPDATE SET
        current_stock = current_stock + excluded.current_stock,
        available_stock = available_stock + excluded.available_stock,
        last_movement_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `);

    const updateGlobalStockStmt = db.prepare(`
      UPDATE items SET current_stock = current_stock + ? WHERE id = ?
    `);

    for (const item of items) {
      const quantity = item.accepted_quantity || item.received_quantity || item.dispatched_quantity || item.planned_quantity;

      // Add back to source location (opposite of deduct)
      if (movement.from_godown_id) {
        updateLocationStockStmt.run(
          item.item_id,
          movement.from_godown_id,
          quantity,
          quantity
        );

        // If adding back to default godown, increase global current_stock
        if (defaultGodownId && movement.from_godown_id === defaultGodownId) {
          updateGlobalStockStmt.run(quantity, item.item_id);
        }
      }

      // Deduct from destination location (opposite of add)
      if (movement.to_godown_id) {
        updateLocationStockStmt.run(
          item.item_id,
          movement.to_godown_id,
          -quantity,
          -quantity
        );

        // If removing from default godown, decrease global current_stock
        if (defaultGodownId && movement.to_godown_id === defaultGodownId) {
          updateGlobalStockStmt.run(-quantity, item.item_id);
        }
      }
    }
  }
}
