export function registerContactHandlers({ ipcMain, getDb }) {
  // =========================================================================
  // UNIFIED CONTACTS API (New)
  // =========================================================================

  ipcMain.handle('get-contacts', async (event, { accountGroupId = null, searchQuery = '' } = {}) => {
    const db = getDb();
    let query = `
      SELECT c.*, ag.name as account_group_name, ag.master_account_id
      FROM contacts c
      LEFT JOIN account_groups ag ON c.account_group_id = ag.id
      WHERE c.is_deleted = 0
    `;
    const params = [];

    if (accountGroupId) {
      query += ` AND c.account_group_id = ?`;
      params.push(accountGroupId);
    }
    if (searchQuery) {
      query += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.gstin LIKE ?)`;
      params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
    }

    query += ` ORDER BY c.name ASC`;
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('add-contact', async (event, contactData) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO contacts (
        account_group_id, name, contact_person, email, phone, gstin, 
        gst_treatment, state, city, country, address, pincode, 
        payment_terms, credit_limit, credit_days, opening_balance, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        contactData.account_group_id,
        contactData.name,
        contactData.contact_person || null,
        contactData.email || null,
        contactData.phone || null,
        contactData.gstin || null,
        contactData.gst_treatment || 'registered',
        contactData.state || 'Maharashtra',
        contactData.city || null,
        contactData.country || 'India',
        contactData.address || null,
        contactData.pincode || null,
        contactData.payment_terms || 15,
        contactData.credit_limit || 0,
        contactData.credit_days || 0,
        contactData.opening_balance || 0,
        contactData.notes || null
      );
      
      // If there's an opening balance, create a transaction for it
      if (contactData.opening_balance && contactData.opening_balance !== 0) {
        // Implementation for opening balance transaction would go here or handled by accounting.js
      }
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  });

  ipcMain.handle('update-contact', async (event, contactData) => {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE contacts SET 
        account_group_id = ?, name = ?, contact_person = ?, email = ?, 
        phone = ?, gstin = ?, gst_treatment = ?, state = ?, city = ?, 
        country = ?, address = ?, pincode = ?, payment_terms = ?, 
        credit_limit = ?, credit_days = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    try {
      stmt.run(
        contactData.account_group_id,
        contactData.name,
        contactData.contact_person || null,
        contactData.email || null,
        contactData.phone || null,
        contactData.gstin || null,
        contactData.gst_treatment || 'registered',
        contactData.state || 'Maharashtra',
        contactData.city || null,
        contactData.country || 'India',
        contactData.address || null,
        contactData.pincode || null,
        contactData.payment_terms || 15,
        contactData.credit_limit || 0,
        contactData.credit_days || 0,
        contactData.notes || null,
        contactData.id
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-contact', async (event, id) => {
    const db = getDb();
    try {
      db.prepare(`UPDATE contacts SET is_deleted = 1 WHERE id = ?`).run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  });

  // =========================================================================
  // ACCOUNT GROUPS API
  // =========================================================================

  ipcMain.handle('get-master-accounts', async (event) => {
    const db = getDb();
    return db.prepare(`SELECT * FROM master_accounts ORDER BY id`).all();
  });

  ipcMain.handle('get-account-groups', async (event) => {
    const db = getDb();
    // Return all groups with their parent and master account names
    return db.prepare(`
      SELECT ag.*, ma.name as master_account_name, ma.type as master_account_type,
             (SELECT COUNT(*) FROM contacts c WHERE c.account_group_id = ag.id AND c.is_deleted = 0) as contact_count
      FROM account_groups ag
      JOIN master_accounts ma ON ag.master_account_id = ma.id
      WHERE ag.is_active = 1
      ORDER BY ag.master_account_id, ag.parent_group_id, ag.name
    `).all();
  });

  ipcMain.handle('add-account-group', async (event, groupData) => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO account_groups (name, master_account_id, parent_group_id, description, is_primary)
        VALUES (?, ?, ?, ?, 0)
      `).run(
        groupData.name, 
        groupData.master_account_id, 
        groupData.parent_group_id || null, 
        groupData.description || null
      );
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding account group:', error);
      throw error;
    }
  });

  ipcMain.handle('update-account-group', async (event, groupData) => {
    const db = getDb();
    try {
      // Only allow updating non-primary groups
      const result = db.prepare(`
        UPDATE account_groups 
        SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_primary = 0
      `).run(groupData.name, groupData.description || null, groupData.id);
      
      if (result.changes === 0) {
        throw new Error('Cannot modify primary account group or group not found.');
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating account group:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-account-group', async (event, id) => {
    const db = getDb();
    try {
      // Check if it has child groups
      const children = db.prepare(`SELECT id FROM account_groups WHERE parent_group_id = ? AND is_active = 1`).get(id);
      if (children) {
        throw new Error('Cannot delete a group that has sub-groups.');
      }
      // Check if it has contacts
      const contacts = db.prepare(`SELECT id FROM contacts WHERE account_group_id = ? AND is_deleted = 0`).get(id);
      if (contacts) {
        throw new Error('Cannot delete a group that has contacts assigned to it.');
      }
      
      const result = db.prepare(`UPDATE account_groups SET is_active = 0 WHERE id = ? AND is_primary = 0`).run(id);
      if (result.changes === 0) {
        throw new Error('Cannot delete primary account group or group not found.');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting account group:', error);
      throw error;
    }
  });

  // =========================================================================
  // BACKWARD COMPATIBILITY WRAPPERS (for existing frontend)
  // =========================================================================

  // --- CUSTOMERS (account_group_id = 13: Sundry Debtors) ---
  
  ipcMain.handle('get-customers', async (event) => {
    const db = getDb();
    // Return matching the old customer table structure for the frontend
    const contacts = db.prepare(`
      SELECT 
        id, 
        name, 
        phone as contact, 
        address, 
        gstin, 
        city, 
        state, 
        email, 
        is_deleted as status_code,
        created_at
      FROM contacts 
      WHERE account_group_id = 13 AND is_deleted = 0
      ORDER BY name ASC
    `).all();
    return contacts;
  });

  ipcMain.handle('add-customer', async (event, customerData) => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO contacts (account_group_id, name, phone, address, gstin, state, city, email, is_active, is_deleted)
        VALUES (13, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `).run(
        customerData.name, 
        customerData.contact || null, 
        customerData.address || null, 
        customerData.gstin || null,
        customerData.state || 'Maharashtra',
        customerData.city || null,
        customerData.email || null
      );
      return {
        id: result.lastInsertRowid,
        name: customerData.name,
        contact: customerData.contact || null,
        address: customerData.address || null,
        gstin: customerData.gstin || null,
        state: customerData.state || 'Maharashtra',
        city: customerData.city || null,
        email: customerData.email || null,
        status_code: 0
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
         throw new Error('A customer with this contact number already exists.');
      }
      throw error;
    }
  });

  ipcMain.handle('update-customer', async (event, customerData) => {
    const db = getDb();
    try {
      db.prepare(`
        UPDATE contacts 
        SET name = ?, phone = ?, address = ?, gstin = ?, state = ?, city = ?, email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND account_group_id = 13
      `).run(
        customerData.name, 
        customerData.contact || null, 
        customerData.address || null, 
        customerData.gstin || null,
        customerData.state || 'Maharashtra',
        customerData.city || null,
        customerData.email || null,
        customerData.id
      );
      return { success: true };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
         throw new Error('A customer with this contact number already exists.');
      }
      throw error;
    }
  });

  ipcMain.handle('delete-customer', async (event, id) => {
    const db = getDb();
    db.prepare(`UPDATE contacts SET is_deleted = 1 WHERE id = ? AND account_group_id = 13`).run(id);
    return { success: true };
  });

  ipcMain.handle("create-customer-if-needed", async (event, customerData) => {
    const db = getDb();
    try {
      if (!customerData.name || !customerData.contact) {
        return { success: true, created: false };
      }

      // Check if contact already exists in Sundry Debtors
      const existingCustomer = db.prepare(`
        SELECT id FROM contacts 
        WHERE phone = ? AND account_group_id = 13 AND is_deleted = 0
      `).get(customerData.contact);

      if (existingCustomer) {
        return { success: true, created: false, id: existingCustomer.id };
      }

      // If not, insert it
      const result = db.prepare(`
        INSERT INTO contacts (account_group_id, name, phone, address, gstin, is_active, is_deleted)
        VALUES (13, ?, ?, ?, ?, 1, 0)
      `).run(
        customerData.name,
        customerData.contact,
        customerData.address || null,
        customerData.gstin || null
      );

      return {
        success: true,
        created: true,
        id: result.lastInsertRowid,
      };
    } catch (error) {
      console.error("Error creating customer if needed:", error);
      return { success: false, error: error.message };
    }
  });

  // --- SUPPLIERS (account_group_id = 5: Sundry Creditors) ---

  ipcMain.handle('get-suppliers', async (event) => {
    const db = getDb();
    // Return matching the old supplier table structure
    const suppliers = db.prepare(`
      SELECT 
        id, 
        name, 
        phone as contact, 
        address, 
        gstin, 
        city, 
        state, 
        email, 
        is_deleted as status_code,
        created_at
      FROM contacts 
      WHERE account_group_id = 5 AND is_deleted = 0
      ORDER BY name ASC
    `).all();
    return suppliers;
  });

  ipcMain.handle('add-supplier', async (event, supplierData) => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO contacts (account_group_id, name, phone, address, gstin, state, city, email, is_active, is_deleted)
        VALUES (5, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `).run(
        supplierData.name, 
        supplierData.contact || null, 
        supplierData.address || null, 
        supplierData.gstin || null,
        supplierData.state || 'Maharashtra',
        supplierData.city || null,
        supplierData.email || null
      );
      return {
        id: result.lastInsertRowid,
        name: supplierData.name,
        contact: supplierData.contact || null,
        address: supplierData.address || null,
        gstin: supplierData.gstin || null,
        state: supplierData.state || 'Maharashtra',
        city: supplierData.city || null,
        email: supplierData.email || null,
        status_code: 0
      };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('update-supplier', async (event, supplierData) => {
    const db = getDb();
    try {
      db.prepare(`
        UPDATE contacts 
        SET name = ?, phone = ?, address = ?, gstin = ?, state = ?, city = ?, email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND account_group_id = 5
      `).run(
        supplierData.name, 
        supplierData.contact || null, 
        supplierData.address || null, 
        supplierData.gstin || null,
        supplierData.state || 'Maharashtra',
        supplierData.city || null,
        supplierData.email || null,
        supplierData.id
      );
      return { success: true };
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle('delete-supplier', async (event, id) => {
    const db = getDb();
    db.prepare(`UPDATE contacts SET is_deleted = 1 WHERE id = ? AND account_group_id = 5`).run(id);
    return { success: true };
  });

}
