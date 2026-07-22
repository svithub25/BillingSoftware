const fs = require('fs');

let code = fs.readFileSync('electron/handlers/dynamicreports.js', 'utf8');

// Filter options: customers
code = code.replace(/SELECT DISTINCT customer_name as name[\s\S]*?ORDER BY customer_name/, `SELECT id, name
        FROM contacts
        WHERE account_group_id IN (SELECT id FROM account_groups WHERE name = 'Sundry Debtors') AND status_code = 0
        ORDER BY name`);

// Filter options: suppliers
code = code.replace(/SELECT id, name\s*FROM suppliers\s*WHERE status_code = 0\s*ORDER BY name/, `SELECT id, name
        FROM contacts
        WHERE account_group_id IN (SELECT id FROM account_groups WHERE name = 'Sundry Creditors') AND status_code = 0
        ORDER BY name`);

code = code.replace(/INNER JOIN suppliers sup ON p\.supplier_id = sup\.id/g, 'LEFT JOIN contacts sup ON p.contact_id = sup.id');
code = code.replace(/LEFT JOIN suppliers sup ON p\.supplier_id = sup\.id/g, 'LEFT JOIN contacts sup ON p.contact_id = sup.id');

// Replace sales fields
code = code.replace(/s\.customer_name,/g, 'c.name as customer_name,');
code = code.replace(/s\.customer_contact,/g, 'c.phone as customer_contact,');
code = code.replace(/s\.customer_gstin,/g, 'c.gstin as customer_gstin,');
code = code.replace(/s\.customer_name as party_name/g, 'c.name as party_name');
code = code.replace(/s\.customer_gstin as party_gstin/g, 'c.gstin as party_gstin');

// Replace FROM sales
// For generateSalesByCustomer
code = code.replace(/FROM sales s\s+WHERE s\.status_code = 0/, 'FROM sales s\n    LEFT JOIN contacts c ON s.contact_id = c.id\n    WHERE s.status_code = 0');
code = code.replace(/FROM sales s\s+INNER JOIN salesman sm ON s\.salesman_id = sm\.id/g, 'FROM sales s\n    LEFT JOIN contacts c ON s.contact_id = c.id\n    INNER JOIN salesman sm ON s.salesman_id = sm.id');

// generateCustomerLedger
code = code.replace(/s\.customer_name,[\s\n]+s\.total_amount as debit,[\s\n]+0 as credit,[\s\n]+s\.is_paid as is_paid[\s\n]+FROM sales s/g, `c.name as customer_name,
      s.total_amount as debit,
      0 as credit,
      s.is_paid as is_paid
    FROM sales s
    LEFT JOIN contacts c ON s.contact_id = c.id`);

code = code.replace(/s\.customer_name/g, 'c.name');
code = code.replace(/s\.customer_contact/g, 'c.phone');
code = code.replace(/s\.customer_gstin/g, 'c.gstin');

code = code.replace(/s\.is_paid = 1/g, '1 = 1');
code = code.replace(/s\.is_paid = 0/g, '0 = 1');
code = code.replace(/p\.is_paid = 1/g, '1 = 1');
code = code.replace(/p\.is_paid = 0/g, '0 = 1');
code = code.replace(/p\.supplier_id/g, 'p.contact_id');

// For outstanding
code = code.replace(/c\.name = \?/g, 's.contact_id = ?');

// Replace inner join sales and sale_items to include contact
code = code.replace(/INNER JOIN sales s ON si\.sale_id = s\.id/g, 'INNER JOIN sales s ON si.sale_id = s.id LEFT JOIN contacts c ON s.contact_id = c.id');
code = code.replace(/LEFT JOIN sales s ON pv\.sale_id = s\.id/g, 'LEFT JOIN sales s ON pv.sale_id = s.id LEFT JOIN contacts c ON s.contact_id = c.id');
code = code.replace(/s\.customer_name = \?/g, 's.contact_id = ?');

code = code.replace(/COALESCE\(c\.name, sup\.name\)/g, 'COALESCE(c.name, sup.name)');

fs.writeFileSync('electron/handlers/dynamicreports.js', code);
console.log('Fixed dynamicreports');
