import sqlite3
import os

DB_PATH = 'database.db'

def check_balances():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file '{DB_PATH}' not found in the current directory.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Query to calculate expected balances based on transaction lines
        # and compare them with the saved current_balance in the contacts table.
        query = """
        SELECT 
            c.id, 
            c.name, 
            c.opening_balance, 
            c.current_balance, 
            IFNULL(SUM(tl.debit - tl.credit), 0) AS calculated_net_transactions,
            (c.opening_balance + IFNULL(SUM(tl.debit - tl.credit), 0)) AS expected_balance
        FROM contacts c
        LEFT JOIN transaction_lines tl ON tl.ledger_id = c.id AND tl.ledger_type = 'contact'
        LEFT JOIN transactions t ON tl.transaction_id = t.id
        WHERE (t.id IS NULL OR t.is_deleted = 0)
        GROUP BY c.id
        HAVING ABS(c.current_balance - (c.opening_balance + IFNULL(SUM(tl.debit - tl.credit), 0))) > 0.01;
        """

        cursor.execute(query)
        mismatched_accounts = cursor.fetchall()

        if not mismatched_accounts:
            print("==================================================")
            print("✅ All contact balances are perfectly tallied!")
            print("==================================================")
            return

        print("==================================================")
        print("❌ WARNING: Mismatched Balances Found!")
        print("==================================================")
        
        for account in mismatched_accounts:
            print(f"Contact ID       : {account['id']}")
            print(f"Name             : {account['name']}")
            print(f"Opening Balance  : ₹{account['opening_balance']:.2f}")
            print(f"Current DB Bal   : ₹{account['current_balance']:.2f}")
            print(f"Expected Balance : ₹{account['expected_balance']:.2f}")
            print(f"Difference       : ₹{abs(account['current_balance'] - account['expected_balance']):.2f}")
            print("-" * 50)
            
        # Optional: Ask user if they want to fix it automatically
        choice = input(f"Do you want to automatically fix these {len(mismatched_accounts)} mismatched balances? (y/n): ")
        if choice.lower() == 'y':
            for account in mismatched_accounts:
                cursor.execute(
                    "UPDATE contacts SET current_balance = ? WHERE id = ?", 
                    (account['expected_balance'], account['id'])
                )
            conn.commit()
            print("✅ All mismatched balances have been fixed successfully!")
        else:
            print("No changes were made to the database.")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    check_balances()
