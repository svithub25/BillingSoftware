export function registerSettingsHandlers({ ipcMain, getDb }) {
  ipcMain.handle('get-settings', async () => {
    const db = getDb();
    return db
      .prepare(
        `SELECT key, value, status_code, updated_at
         FROM settings
         WHERE key IN ('gst_on_sale', 'gst_on_purchase')
         ORDER BY key`
      )
      .all();
  });

  ipcMain.handle('update-setting', async (event, key, value) => {
    const db = getDb();
    const normalizedValue = String(value === 1 || value === '1' || value === true ? '1' : '0');

    const result = db
      .prepare(
        `UPDATE settings
         SET value = ?, updated_at = CURRENT_TIMESTAMP
         WHERE key = ?`
      )
      .run(normalizedValue, key);

    if (result.changes === 0) {
      db.prepare('INSERT INTO settings (key, value, status_code) VALUES (?, ?, 0)').run(key, normalizedValue);
    }

    return { success: true, key, value: normalizedValue };
  });
}
