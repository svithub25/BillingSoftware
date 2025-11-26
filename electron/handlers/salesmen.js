export function registerSalesmanHandlers({ ipcMain, getDb }) {
  ipcMain.handle('add-salesman', async (event, salesmanData) => {
    const stmt = getDb().prepare(
      `INSERT INTO salesman
        (name, contact_info, address, joining_date, email, state, city, country, pincode, gstin, credit_limit, credit_days, working_area)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      salesmanData.name,
      salesmanData.contact_info,
      salesmanData.address,
      salesmanData.joining_date,
      salesmanData.email,
      salesmanData.state,
      salesmanData.city,
      salesmanData.country || 'India',
      salesmanData.pincode,
      salesmanData.gstin,
      salesmanData.credit_limit,
      salesmanData.credit_days,
      salesmanData.working_area
    );
    return { id: result.lastInsertRowid, ...salesmanData };
  });

  ipcMain.handle('get-salesmen', async () => {
    return getDb()
      .prepare('SELECT * FROM salesman WHERE status_code = 0 OR status_code IS NULL ORDER BY name')
      .all();
  });

  ipcMain.handle('update-salesman', async (event, salesmanData) => {
    const stmt = getDb().prepare(
      `UPDATE salesman SET
        name = ?, contact_info = ?, address = ?, joining_date = ?,
        email = ?, state = ?, city = ?, country = ?, pincode = ?, gstin = ?,
        credit_limit = ?, credit_days = ?, working_area = ?
        WHERE id = ?`
    );
    const result = stmt.run(
      salesmanData.name,
      salesmanData.contact_info,
      salesmanData.address,
      salesmanData.joining_date,
      salesmanData.email,
      salesmanData.state,
      salesmanData.city,
      salesmanData.country || 'India',
      salesmanData.pincode,
      salesmanData.gstin,
      salesmanData.credit_limit,
      salesmanData.credit_days,
      salesmanData.working_area,
      salesmanData.id
    );
    return result.changes > 0;
  });

  ipcMain.handle('delete-salesman', async (event, id) => {
    const stmt = getDb().prepare('UPDATE salesman SET status_code = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  });
}
