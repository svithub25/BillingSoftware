export const migration_010_fixing_issue_batch_edit = {
  name: "010_fixing_issue_batch_edit",
  up(db) {
    db.exec(`
        UPDATE item_batches 
        SET qty_available = qty_received - COALESCE(
          (
            SELECT SUM(sica.quantity_allocated) 
            FROM sale_item_cost_allocation sica 
            JOIN sale_items si ON sica.sale_item_id = si.id
            WHERE sica.purchase_item_id = item_batches.purchase_item_id 
            AND (si.status_code = 0 OR si.status_code IS NULL)
          ), 
          0
        );
        `);
  },
};
