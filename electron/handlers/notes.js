export function registerNotesHandlers({ ipcMain, getDb }) {
  // Create Note
  ipcMain.handle('create-credit-debit-note', async (event, noteData) => {
    console.log('Creating credit/debit note with data:', noteData);
    const db = getDb(); 
    const {
      note_number, note_type, reference_type, sale_id, purchase_id,
      original_invoice_number, original_invoice_date,
      party_name, party_contact, party_address, party_gstin, party_state, party_city,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    // Insert note items
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
      items.forEach(item => {
        itemStmt.run(
          noteId, item.item_id, item.original_sale_item_id, item.original_purchase_item_id,
          item.item_name, item.hsn_code, item.original_quantity, item.return_quantity,
          item.unit_price, item.discount, item.taxable_amount, item.gst_percentage,
          item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount,
          item.item_condition, item.remarks, item.status_code || 0
        );
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
      items.forEach(item => {
        itemStmt.run(
          id, item.item_id, item.original_sale_item_id, item.original_purchase_item_id,
          item.item_name, item.hsn_code, item.original_quantity, item.return_quantity,
          item.unit_price, item.discount, item.taxable_amount, item.gst_percentage,
          item.cgst_amount, item.sgst_amount, item.igst_amount, item.total_amount,
          item.item_condition, item.remarks, item.status_code || 0
        );
      });
    }

    return { success: true };
  });

  // Delete Note
  ipcMain.handle('delete-credit-debit-note', async (event, noteId) => {
    const db = getDb();
    db.prepare(`DELETE FROM credit_debit_notes WHERE id=?`).run(noteId);
    db.prepare(`DELETE FROM credit_debit_note_items WHERE note_id=?`).run(noteId);
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