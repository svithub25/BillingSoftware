import sqlite3
import os

DB_PATH = 'database.db'

def check_stock():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file '{DB_PATH}' not found.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print("==================================================")
        print("Checking Item-Level Stock...")
        print("==================================================")

        # Let's calculate expected stock for each item
        query_items = """
        SELECT 
            i.id,
            i.name,
            i.current_stock,
            
            IFNULL((SELECT SUM(opening_qty) FROM opening_stock WHERE item_id = i.id), 0) AS opening_stock_qty,
            
            IFNULL((SELECT SUM(quantity) FROM purchase_items pi JOIN purchases p ON p.id = pi.purchase_id WHERE pi.item_id = i.id AND p.status_code = 0), 0) AS total_purchased,
            
            IFNULL((SELECT SUM(quantity) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.item_id = i.id AND s.status_code = 0), 0) AS total_sold,
            
            IFNULL((SELECT SUM(return_quantity) FROM credit_debit_note_items cni JOIN credit_debit_notes cn ON cn.id = cni.note_id WHERE cni.item_id = i.id AND cn.status_code = 0 AND cni.original_sale_item_id IS NOT NULL), 0) AS sales_returns,
            
            IFNULL((SELECT SUM(return_quantity) FROM credit_debit_note_items cni JOIN credit_debit_notes cn ON cn.id = cni.note_id WHERE cni.item_id = i.id AND cn.status_code = 0 AND cni.original_purchase_item_id IS NOT NULL), 0) AS purchase_returns
            
            -- We can add stock movements if they are heavily used, but for now we focus on the core sales/purchases/returns
        FROM items i
        """
        
        cursor.execute(query_items)
        items = cursor.fetchall()

        mismatched_items = []
        for item in items:
            expected = item['opening_stock_qty'] + item['total_purchased'] - item['total_sold'] + item['sales_returns'] - item['purchase_returns']
            
            # Allow minor floating point difference
            if abs(item['current_stock'] - expected) > 0.01:
                mismatched_items.append({
                    'id': item['id'],
                    'name': item['name'],
                    'current_stock': item['current_stock'],
                    'expected_stock': expected,
                    'details': {
                        'opening': item['opening_stock_qty'],
                        'purchased': item['total_purchased'],
                        'sold': item['total_sold'],
                        'sales_returns': item['sales_returns'],
                        'purchase_returns': item['purchase_returns']
                    }
                })

        if not mismatched_items:
            print("[OK] All item-level stocks are perfectly tallied!")
        else:
            print(f"[ERROR] Found {len(mismatched_items)} mismatched items:")
            for item in mismatched_items:
                print(f"Item: {item['name']} (ID: {item['id']})")
                print(f"  Current DB Stock : {item['current_stock']}")
                print(f"  Expected Stock   : {item['expected_stock']}")
                print(f"  Calculation      : Opening ({item['details']['opening']}) + Purchased ({item['details']['purchased']}) - Sold ({item['details']['sold']}) + Sales Returns ({item['details']['sales_returns']}) - Purchase Returns ({item['details']['purchase_returns']})")
                print("-" * 50)


        print("\n==================================================")
        print("Checking Batch-Level Stock...")
        print("==================================================")

        # Check batches
        query_batches = """
        SELECT 
            b.id AS batch_id,
            b.batch_number,
            i.name AS item_name,
            b.qty_received,
            b.qty_available,
            
            IFNULL((
                SELECT SUM(ca.quantity_allocated) 
                FROM sale_item_cost_allocation ca
                JOIN sale_items si ON si.id = ca.sale_item_id
                JOIN sales s ON s.id = si.sale_id
                WHERE ca.purchase_item_id = b.purchase_item_id
                AND si.status_code = 0 AND s.status_code = 0
            ), 0) AS total_allocated_to_sales,
            
            IFNULL((
                SELECT SUM(return_quantity) 
                FROM credit_debit_note_items 
                WHERE original_purchase_item_id = b.purchase_item_id
            ), 0) AS returned_to_supplier
            
        FROM item_batches b
        JOIN items i ON i.id = b.item_id
        """

        cursor.execute(query_batches)
        batches = cursor.fetchall()

        mismatched_batches = []
        for batch in batches:
            # qty_available should be qty_received - sold - returned to supplier
            expected_available = batch['qty_received'] - batch['total_allocated_to_sales'] - batch['returned_to_supplier']
            
            if abs(batch['qty_available'] - expected_available) > 0.01:
                mismatched_batches.append({
                    'batch_id': batch['batch_id'],
                    'batch_number': batch['batch_number'],
                    'item_name': batch['item_name'],
                    'qty_available': batch['qty_available'],
                    'expected_available': expected_available,
                    'details': {
                        'received': batch['qty_received'],
                        'sold': batch['total_allocated_to_sales'],
                        'returned_to_supplier': batch['returned_to_supplier']
                    }
                })

        if not mismatched_batches:
            print("[OK] All batch-level quantities are perfectly tallied!")
        else:
            print(f"[ERROR] Found {len(mismatched_batches)} mismatched batches:")
            for batch in mismatched_batches:
                print(f"Batch: {batch['batch_number']} | Item: {batch['item_name']} (Batch ID: {batch['batch_id']})")
                print(f"  Current Available : {batch['qty_available']}")
                print(f"  Expected Available: {batch['expected_available']}")
                print(f"  Calculation       : Received ({batch['details']['received']}) - Sold ({batch['details']['sold']}) - Returned to Supplier ({batch['details']['returned_to_supplier']})")
                print("-" * 50)
                
            print("\n⚠️  PLEASE RUN 'python heal_allocations.py' TO PROPERLY FIX THESE BATCH MISMATCHES! ⚠️")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    check_stock()
