const sanitize = (val) => (typeof val === 'string' && val.trim() === '') ? null : val;

export function registerCustomerHandlers({ ipcMain, getDb }) {
  ipcMain.handle('create-customer-if-needed', async (event, customer) => {
    const contact = sanitize(customer?.contact);
    if (!contact) return null;

    const exists = getDb()
      .prepare('SELECT id FROM customer WHERE contact = ? AND (status_code = 0 OR status_code IS NULL)')
      .get(contact);
    if (exists) return exists.id;

    const stmt = getDb().prepare('INSERT INTO customer (name, contact, address, gstin) VALUES (?, ?, ?, ?)');
    const result = stmt.run(
      sanitize(customer.name),
      contact,
      sanitize(customer.address),
      sanitize(customer.gstin)
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
      sanitize(customer.name),
      sanitize(customer.contact),
      sanitize(customer.address),
      sanitize(customer.gstin),
      sanitize(customer.email),
      sanitize(customer.state),
      sanitize(customer.city),
      sanitize(customer.country) || 'India',
      sanitize(customer.pincode),
      sanitize(customer.credit_limit),
      sanitize(customer.credit_days)
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
      sanitize(customer.name),
      sanitize(customer.contact),
      sanitize(customer.address),
      sanitize(customer.gstin),
      sanitize(customer.email),
      sanitize(customer.state),
      sanitize(customer.city),
      sanitize(customer.country) || 'India',
      sanitize(customer.pincode),
      sanitize(customer.credit_limit),
      sanitize(customer.credit_days),
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


