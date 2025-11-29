export function registerNotesHandlers({ ipcMain, getDb }) {
  // Generate Note Number
  ipcMain.handle('generate-note-number', async (event, noteType) => {
    const db = getDb();
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const yearSuffix = `${currentYear.toString().slice(-2)}-${nextYear.toString().slice(-2)}`;
    const prefix = noteType === 'credit' ? 'CN' : 'DN';

    const lastNote = db.prepare(`
      SELECT note_number FROM credit_debit_notes
      WHERE note_number LIKE ?
      ORDER BY id DESC LIMIT 1
    `).get(`${prefix}/${yearSuffix}/%`);

    let nextNumber = 1;
    if (lastNote?.note_number) {
      const match = lastNote.note_number.match(/(?:CN|DN)\/\d{2}-\d{2}\/(\d+)/);
      if (match?.[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}/${yearSuffix}/${nextNumber.toString().padStart(4, '0')}`;
  });

  // Create Note
  ipcMain.handle('create-credit-debit-note', async (event, noteData) => {
    console.log('Creating credit/debit note with data:', noteData);
    const db = getDb();
    const {
      note_number, note_type, reference_type, sale_id, purchase_id,
      original_invoice_number, original_invoice_date,
      party_name, party_contact, party_address, party_gstin, party_state, party_city,
      // salesman_id,
      note_date, reason, reason_code,
      subtotal, discount, cgst_total, sgst_total, igst_total, other_charges, rounding_off, total_amount,
      is_settled, settlement_method, settlement_date, settlement_reference,
      is_approved, approved_by, approved_at, remarks, status_code,
      items // Array of note items
    } = noteData;

    const noteStmt = db.prepare(`
      INSERT INTO credit_debit_notes (
        note_number, note_type, reference_type, sale_id, purchase_id,
        original_invoice_number, original_invoice_date,
        party_name, party_contact, party_address, party_gstin, party_state, party_city,

        note_date, reason, reason_code,
        subtotal, discount, cgst_total, sgst_total, igst_total, other_charges, rounding_off, total_amount,
        is_settled, settlement_method, settlement_date, settlement_reference,
        is_approved, approved_by, approved_at, remarks, status_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = noteStmt.run(
      note_number, note_type, reference_type, sale_id, purchase_id,
      original_invoice_number, original_invoice_date,
      party_name, party_contact, party_address, party_gstin, party_state, party_city,

      note_date, reason, reason_code,
      subtotal, discount, cgst_total, sgst_total, igst_total, other_charges, rounding_off, total_amount,
      is_settled, settlement_method, settlement_date, settlement_reference,
      is_approved, approved_by, approved_at, remarks, status_code
    );
    const noteId = result.lastInsertRowid;

    // Insert note items and adjust stock
    if (Array.isArray(items)) {
      const itemStmt = db.prepare(`
        INSERT INTO credit_debit_note_items (
          note_id, item_id, original_sale_item_id, original_purchase_item_id,
          item_name, hsn_code, original_quantity, return_quantity,
          unit_price, discount, taxable_amount, gst_percentage,
          cgst_amount, sgst_amount, igst_amount, total_amount,
          item_condition, remarks, status_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stockAdjustStmt = db.prepare(`
        INSERT INTO note_stock_adjustments (
          note_item_id, item_id, adjustment_type, quantity,
          previous_stock, new_stock, adjustment_date, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `);

      items.forEach(item => {
        // Insert note item
        const itemResult = itemStmt.run(
          noteId, item.item_id, item.original_sale_item_id, item.original_purchase_item_id,
          item.item_name, item.hsn_code, item.original_quantity, item.return_quantity,
          item.unit_price, item.discount, item.taxable_amount, item.gst_percentage,
          item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount,
          item.item_condition, item.remarks, item.status_code || 0
        );
        const noteItemId = itemResult.lastInsertRowid;

        // Adjust stock if item_id exists
        if (item.item_id) {
          const currentItem = db.prepare(`SELECT current_stock FROM items WHERE id = ?`).get(item.item_id);
          const previousStock = currentItem ? currentItem.current_stock : 0;

          // Credit note (sales return): ADD to stock
          // Debit note (purchase return): SUBTRACT from stock
          const stockChange = note_type === 'credit'
            ? Number(item.return_quantity)
            : -Number(item.return_quantity);

          const newStock = previousStock + stockChange;

          // Update item stock
          db.prepare(`UPDATE items SET current_stock = ? WHERE id = ?`).run(newStock, item.item_id);

          // Record stock adjustment
          stockAdjustStmt.run(
            noteItemId,
            item.item_id,
            note_type === 'credit' ? 'add' : 'subtract',
            Math.abs(stockChange),
            previousStock,
            newStock,
            `${note_type === 'credit' ? 'Credit' : 'Debit'} Note: ${note_number}`
          );
        }
      });
    }

    return { success: true };
  });

  // Update Note
  ipcMain.handle('update-credit-debit-note', async (event, noteData) => {
    const db = getDb();
    const {
      id, note_number, note_type, reference_type, sale_id, purchase_id,
      original_invoice_number, original_invoice_date,
      party_name, party_contact, party_address, party_gstin, party_state, party_city,

      note_date, reason, reason_code,
      subtotal, discount, cgst_total, sgst_total, igst_total, other_charges, rounding_off, total_amount,
      is_settled, settlement_method, settlement_date, settlement_reference,
      is_approved, approved_by, approved_at, remarks, status_code,
      items // Array of note items
    } = noteData;

    // Get old items to reverse their stock adjustments
    const oldItems = db.prepare(`
      SELECT item_id, return_quantity
      FROM credit_debit_note_items
      WHERE note_id = ? AND item_id IS NOT NULL
    `).all(id);

    // Get the old note type
    const oldNote = db.prepare(`SELECT note_type FROM credit_debit_notes WHERE id = ?`).get(id);
    const oldNoteType = oldNote ? oldNote.note_type : note_type;

    // Reverse old stock adjustments
    oldItems.forEach(oldItem => {
      if (oldItem.item_id) {
        const currentItem = db.prepare(`SELECT current_stock FROM items WHERE id = ?`).get(oldItem.item_id);
        if (currentItem) {
          // Reverse the adjustment: if it was credit (added), now subtract; if debit (subtracted), now add
          const reverseChange = oldNoteType === 'credit'
            ? -Number(oldItem.return_quantity)
            : Number(oldItem.return_quantity);

          const newStock = currentItem.current_stock + reverseChange;
          db.prepare(`UPDATE items SET current_stock = ? WHERE id = ?`).run(newStock, oldItem.item_id);
        }
      }
    });

    // Update the note
    db.prepare(`
      UPDATE credit_debit_notes SET
        note_number=?, note_type=?, reference_type=?, sale_id=?, purchase_id=?,
        original_invoice_number=?, original_invoice_date=?,
        party_name=?, party_contact=?, party_address=?, party_gstin=?, party_state=?, party_city=?,

        note_date=?, reason=?, reason_code=?,
        subtotal=?, discount=?, cgst_total=?, sgst_total=?, igst_total=?, other_charges=?, rounding_off=?, total_amount=?,
        is_settled=?, settlement_method=?, settlement_date=?, settlement_reference=?,
        is_approved=?, approved_by=?, approved_at=?, remarks=?, status_code=?
      WHERE id=?
    `).run(
      note_number, note_type, reference_type, sale_id, purchase_id,
      original_invoice_number, original_invoice_date,
      party_name, party_contact, party_address, party_gstin, party_state, party_city,

      note_date, reason, reason_code,
      subtotal, discount, cgst_total, sgst_total, igst_total, other_charges, rounding_off, total_amount,
      is_settled, settlement_method, settlement_date, settlement_reference,
      is_approved, approved_by, approved_at, remarks, status_code, id
    );

    // Delete old items and insert new ones
    db.prepare(`DELETE FROM credit_debit_note_items WHERE note_id=?`).run(id);

    if (Array.isArray(items)) {
      const itemStmt = db.prepare(`
        INSERT INTO credit_debit_note_items (
          note_id, item_id, original_sale_item_id, original_purchase_item_id,
          item_name, hsn_code, original_quantity, return_quantity,
          unit_price, discount, taxable_amount, gst_percentage,
          cgst_amount, sgst_amount, igst_amount, total_amount,
          item_condition, remarks, status_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const stockAdjustStmt = db.prepare(`
        INSERT INTO note_stock_adjustments (
          note_item_id, item_id, adjustment_type, quantity,
          previous_stock, new_stock, adjustment_date, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `);

      items.forEach(item => {
        // Insert new item
        const itemResult = itemStmt.run(
          id, item.item_id, item.original_sale_item_id, item.original_purchase_item_id,
          item.item_name, item.hsn_code, item.original_quantity, item.return_quantity,
          item.unit_price, item.discount, item.taxable_amount, item.gst_percentage,
          item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount,
          item.item_condition, item.remarks, item.status_code || 0
        );
        const noteItemId = itemResult.lastInsertRowid;

        // Apply new stock adjustments
        if (item.item_id) {
          const currentItem = db.prepare(`SELECT current_stock FROM items WHERE id = ?`).get(item.item_id);
          const previousStock = currentItem ? currentItem.current_stock : 0;

          // Credit note (sales return): ADD to stock
          // Debit note (purchase return): SUBTRACT from stock
          const stockChange = note_type === 'credit'
            ? Number(item.return_quantity)
            : -Number(item.return_quantity);

          const newStock = previousStock + stockChange;

          // Update item stock
          db.prepare(`UPDATE items SET current_stock = ? WHERE id = ?`).run(newStock, item.item_id);

          // Record stock adjustment
          stockAdjustStmt.run(
            noteItemId,
            item.item_id,
            note_type === 'credit' ? 'add' : 'subtract',
            Math.abs(stockChange),
            previousStock,
            newStock,
            `${note_type === 'credit' ? 'Credit' : 'Debit'} Note Update: ${note_number}`
          );
        }
      });
    }

    return { success: true };
  });

  // Delete Note
  ipcMain.handle('delete-credit-debit-note', async (event, noteId) => {
    const db = getDb();

    // Get note details
    const note = db.prepare(`SELECT note_type FROM credit_debit_notes WHERE id = ?`).get(noteId);

    if (note) {
      // Get all items to reverse stock adjustments
      const items = db.prepare(`
        SELECT id, item_id, return_quantity
        FROM credit_debit_note_items
        WHERE note_id = ? AND item_id IS NOT NULL
      `).all(noteId);

      // Reverse stock adjustments
      items.forEach(item => {
        if (item.item_id) {
          const currentItem = db.prepare(`SELECT current_stock FROM items WHERE id = ?`).get(item.item_id);
          if (currentItem) {
            // Reverse the adjustment: if it was credit (added), now subtract; if debit (subtracted), now add
            const reverseChange = note.note_type === 'credit'
              ? -Number(item.return_quantity)
              : Number(item.return_quantity);

            const newStock = currentItem.current_stock + reverseChange;
            db.prepare(`UPDATE items SET current_stock = ? WHERE id = ?`).run(newStock, item.item_id);
          }
        }

        // Delete stock adjustment records for this item
        db.prepare(`DELETE FROM note_stock_adjustments WHERE note_item_id = ?`).run(item.id);
      });
    }

    // Delete the note and its items
    db.prepare(`DELETE FROM credit_debit_note_items WHERE note_id=?`).run(noteId);
    db.prepare(`DELETE FROM credit_debit_notes WHERE id=?`).run(noteId);

    return { success: true };
  });

  // Fetch Notes
  ipcMain.handle('get-credit-debit-notes', async (event, { type, search, dateFrom, dateTo }) => {
    const db = getDb();
    let query = `SELECT * FROM credit_debit_notes WHERE status_code=0`;
    const params = [];
    if (type && type !== 'all') {
      query += ` AND note_type=?`;
      params.push(type);
    }
    if (search) {
      query += ` AND (note_number LIKE ? OR party_name LIKE ? OR original_invoice_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (dateFrom) {
      query += ` AND note_date >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND note_date <= ?`;
      params.push(dateTo);
    }
    query += ` ORDER BY note_date DESC`;

    const notes = db.prepare(query).all(...params);

    // Fetch items for each note
    const itemStmt = db.prepare(`SELECT * FROM credit_debit_note_items WHERE note_id=?`);
    notes.forEach(note => {
      note.items = itemStmt.all(note.id);
    });

    return notes;
  });
}