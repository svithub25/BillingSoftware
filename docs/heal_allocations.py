import sqlite3
import os

DB_PATH = 'database.db'

def heal_db():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Step 1: Get all active items
        cursor.execute("SELECT id FROM items")
        items = cursor.fetchall()

        for item in items:
            item_id = item['id']
            
            # Step 2: Reset batches to full qty_received
            cursor.execute("""
                UPDATE item_batches 
                SET qty_available = qty_received 
                WHERE item_id = ?
            """, (item_id,))
            
            # Step 3: Delete all allocations for this item
            cursor.execute("""
                DELETE FROM sale_item_cost_allocation 
                WHERE sale_item_id IN (
                    SELECT id FROM sale_items WHERE item_id = ?
                )
            """, (item_id,))
            
            # Step 4: Fetch all active sale items, ordered by ID (chronological)
            cursor.execute("""
                SELECT si.id, si.quantity 
                FROM sale_items si
                JOIN sales s ON s.id = si.sale_id
                WHERE si.item_id = ? AND si.status_code = 0 AND s.status_code = 0
                ORDER BY si.id ASC
            """, (item_id,))
            active_sales = cursor.fetchall()
            
            # Step 5: Fetch batches for FIFO allocation
            cursor.execute("""
                SELECT id, purchase_item_id, qty_available, purchase_rate 
                FROM item_batches 
                WHERE item_id = ? 
                ORDER BY id ASC
            """, (item_id,))
            batches = [dict(row) for row in cursor.fetchall()]
            
            # Step 6: Allocate FIFO
            for sale in active_sales:
                qty_needed = float(sale['quantity'])
                
                for batch in batches:
                    if qty_needed <= 0:
                        break
                        
                    if batch['qty_available'] > 0:
                        allocate_qty = min(qty_needed, batch['qty_available'])
                        
                        cost_amount = allocate_qty * float(batch['purchase_rate'])
                        cursor.execute("""
                            INSERT INTO sale_item_cost_allocation 
                            (sale_item_id, purchase_item_id, quantity_allocated, purchase_rate, cost_amount)
                            VALUES (?, ?, ?, ?, ?)
                        """, (sale['id'], batch['purchase_item_id'], allocate_qty, batch['purchase_rate'], cost_amount))
                        
                        batch['qty_available'] -= allocate_qty
                        qty_needed -= allocate_qty
                        
            # Step 7: Save the remaining qty_available back to the db
            for batch in batches:
                cursor.execute("""
                    UPDATE item_batches 
                    SET qty_available = ? 
                    WHERE id = ?
                """, (batch['qty_available'], batch['id']))

        conn.commit()
        print("Successfully rebuilt all allocations and batch quantities!")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    heal_db()
