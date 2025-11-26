export function registerSupplierHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-suppliers', async () => {
    return getDb()
      .prepare('SELECT * FROM suppliers WHERE (status_code = 0 OR status_code IS NULL) ORDER BY name')
      .all();
  });

  ipcMain.handle('add-supplier', async (event, supplier) => {
    const {
      name, contact, address, gstin,
      email, state, city, country = 'India', pincode, credit_days
    } = supplier;
    const stmt = getDb().prepare(
      `INSERT INTO suppliers
        (name, contact, address, gstin, email, state, city, country, pincode, credit_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      name, contact, address, gstin, email, state, city, country, pincode, credit_days
    );
    return { id: result.lastInsertRowid, ...supplier };
  });

  ipcMain.handle('update-supplier', async (event, supplier) => {
    const {
      id, name, contact, address, gstin,
      email, state, city, country = 'India', pincode, credit_days
    } = supplier;
    const stmt = getDb().prepare(
      `UPDATE suppliers SET
        name = ?, contact = ?, address = ?, gstin = ?,
        email = ?, state = ?, city = ?, country = ?, pincode = ?, credit_days = ?
        WHERE id = ?`
    );
    const result = stmt.run(
      name, contact, address, gstin, email, state, city, country, pincode, credit_days, id
    );
    return result.changes > 0;
  });

  ipcMain.handle('delete-supplier', async (event, id) => {
    const stmt = getDb().prepare('UPDATE suppliers SET status_code = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  });
}


