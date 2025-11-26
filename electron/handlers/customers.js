export function registerCustomerHandlers({ ipcMain, getDb }) {
  ipcMain.handle('create-customer-if-needed', async (event, customer) => {
    if (!customer?.contact) return null;

    const exists = getDb()
      .prepare('SELECT id FROM customer WHERE contact = ? AND (status_code = 0 OR status_code IS NULL)')
      .get(customer.contact);
    if (exists) return exists.id;

    const stmt = getDb().prepare('INSERT INTO customer (name, contact, address, gstin) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      customer.name || null,
      customer.contact,
      customer.address || null,
      customer.gstin || null
    );
    return result.lastInsertRowid;
  });

  ipcMain.handle('get-customers', async () => {
    return getDb()
      .prepare('SELECT * FROM customer WHERE (status_code = 0 OR status_code IS NULL) ORDER BY name')
      .all();
  });

  ipcMain.handle('add-customer', async (event, customer) => {
    const stmt = getDb().prepare(
      `INSERT INTO customer
        (name, contact, address, gstin, email, state, city, country, pincode, credit_limit, credit_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      customer.name,
      customer.contact,
      customer.address,
      customer.gstin,
      customer.email,
      customer.state,
      customer.city,
      customer.country || 'India',
      customer.pincode,
      customer.credit_limit,
      customer.credit_days
    );
    return { id: result.lastInsertRowid, ...customer };
  });

  ipcMain.handle('update-customer', async (event, customer) => {
    const stmt = getDb().prepare(
      `UPDATE customer SET
        name = ?, contact = ?, address = ?, gstin = ?,
        email = ?, state = ?, city = ?, country = ?, pincode = ?, credit_limit = ?, credit_days = ?
        WHERE id = ?`
    );
    const result = stmt.run(
      customer.name,
      customer.contact,
      customer.address,
      customer.gstin,
      customer.email,
      customer.state,
      customer.city,
      customer.country || 'India',
      customer.pincode,
      customer.credit_limit,
      customer.credit_days,
      customer.id
    );
    return result.changes > 0;
  });

  ipcMain.handle('delete-customer', async (event, id) => {
    const stmt = getDb().prepare('UPDATE customer SET status_code = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  });
}


