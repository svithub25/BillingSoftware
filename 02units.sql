-- ============================================================================
-- MULTI-UNIT SYSTEM - COMPLETE SCHEMA
-- This integrates with your existing 'units' table
-- ============================================================================

-- STEP 1: Your existing 'units' table stays as is (Master unit list)
-- No changes needed to this table
/*
CREATE TABLE units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
*/

-- STEP 2: Populate units table with common units (if not already done)
INSERT OR IGNORE INTO units (name) VALUES 
('pcs'),
('piece'),
('box'),
('dozen'),
('carton'),
('kg'),
('gram'),
('liter'),
('ml'),
('meter'),
('feet'),
('pack'),
('bundle'),
('roll'),
('sheet'),
('pair'),
('set');

-- ============================================================================
-- STEP 3: Create item_units table (Item-specific unit conversions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    unit_id INTEGER,  -- Links to units table (recommended but optional)
    unit_name TEXT NOT NULL,  -- Store name for data integrity
    conversion_factor REAL NOT NULL,  -- How many base units = 1 of this unit
    is_base_unit INTEGER DEFAULT 0,  -- 1 if this is the base/smallest unit
    is_purchase_unit INTEGER DEFAULT 0,  -- Can be used in purchases
    is_sale_unit INTEGER DEFAULT 0,  -- Can be used in sales
    barcode TEXT,  -- Optional: unit-specific barcode
    status_code INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units (id),
    UNIQUE(item_id, unit_name),
    CHECK(conversion_factor > 0)
);

-- ============================================================================
-- STEP 4: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_item_units_item ON item_units(item_id);
CREATE INDEX IF NOT EXISTS idx_item_units_unit ON item_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_item_units_base ON item_units(item_id, is_base_unit);
CREATE INDEX IF NOT EXISTS idx_item_units_status ON item_units(status_code);
CREATE INDEX IF NOT EXISTS idx_item_units_purchase ON item_units(is_purchase_unit);
CREATE INDEX IF NOT EXISTS idx_item_units_sale ON item_units(is_sale_unit);
CREATE INDEX IF NOT EXISTS idx_item_units_barcode ON item_units(barcode);

-- ============================================================================
-- STEP 5: Modify existing tables to support multi-unit
-- ============================================================================

-- Add unit_id to purchase_items (if column doesn't exist)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so check first
-- ALTER TABLE purchase_items ADD COLUMN unit_id INTEGER REFERENCES item_units(id);

-- Add unit_id to sale_items
-- ALTER TABLE sale_items ADD COLUMN unit_id INTEGER REFERENCES item_units(id);

-- For SQLite, you need to check if column exists first
-- Run these only if columns don't exist:
PRAGMA table_info(purchase_items);
PRAGMA table_info(sale_items);

-- If you need to add columns, use these (remove comments):
/*
ALTER TABLE purchase_items ADD COLUMN unit_id INTEGER REFERENCES item_units(id);
ALTER TABLE sale_items ADD COLUMN unit_id INTEGER REFERENCES item_units(id);
*/

-- ============================================================================
-- STEP 6: Migration - Create base units for all existing items
-- ============================================================================

-- This creates a base unit entry for each existing item
-- Links to units table where possible
INSERT OR IGNORE INTO item_units 
    (item_id, unit_id, unit_name, conversion_factor, is_base_unit, is_purchase_unit, is_sale_unit)
SELECT 
    i.id,
    u.id,  -- Link to units table
    COALESCE(i.unit, 'pcs'),
    1.0,  -- Base unit always has conversion factor of 1
    1,    -- Mark as base unit
    1,    -- Can be used for purchase
    1     -- Can be used for sale
FROM items i
LEFT JOIN units u ON u.name = COALESCE(i.unit, 'pcs')
WHERE u.id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM item_units WHERE item_units.item_id = i.id
);

-- For items whose unit doesn't exist in units table, create without unit_id
INSERT OR IGNORE INTO item_units 
    (item_id, unit_name, conversion_factor, is_base_unit, is_purchase_unit, is_sale_unit)
SELECT 
    i.id,
    COALESCE(i.unit, 'pcs'),
    1.0,
    1,
    1,
    1
FROM items i
WHERE NOT EXISTS (
    SELECT 1 FROM item_units WHERE item_units.item_id = i.id
);

-- ============================================================================
-- STEP 7: Create comprehensive view for easy querying
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_item_units AS
SELECT 
    iu.id as unit_id,
    iu.item_id,
    i.name as item_name,
    i.sku,
    i.hsn_code,
    iu.unit_id as master_unit_id,
    iu.unit_name,
    u.name as master_unit_name,
    iu.conversion_factor,
    iu.is_base_unit,
    iu.is_purchase_unit,
    iu.is_sale_unit,
    iu.barcode as unit_barcode,
    i.purchase_rate as base_purchase_rate,
    i.sale_rate as base_sale_rate,
    i.mrp as base_mrp,
    -- Calculate rates for this unit
    ROUND(i.purchase_rate * iu.conversion_factor, 2) as unit_purchase_rate,
    ROUND(i.sale_rate * iu.conversion_factor, 2) as unit_sale_rate,
    ROUND(i.mrp * iu.conversion_factor, 2) as unit_mrp,
    -- Stock information
    i.current_stock as stock_in_base_unit,
    ROUND(CAST(i.current_stock AS REAL) / iu.conversion_factor, 3) as stock_in_this_unit,
    -- Full/Partial stock breakdown
    CAST(i.current_stock / iu.conversion_factor AS INTEGER) as full_units,
    (i.current_stock % CAST(iu.conversion_factor AS INTEGER)) as remaining_base_units,
    i.minimum_stock,
    iu.status_code,
    i.status_code as item_status
FROM item_units iu
JOIN items i ON iu.item_id = i.id
LEFT JOIN units u ON iu.unit_id = u.id
WHERE iu.status_code = 0 AND i.status_code = 0;

-- ============================================================================
-- STEP 8: Create view for purchase-specific units
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_purchase_units AS
SELECT * FROM v_item_units
WHERE is_purchase_unit = 1
ORDER BY item_id, conversion_factor ASC;

-- ============================================================================
-- STEP 9: Create view for sale-specific units
-- ============================================================================
CREATE VIEW IF NOT EXISTS v_sale_units AS
SELECT * FROM v_item_units
WHERE is_sale_unit = 1
ORDER BY item_id, conversion_factor ASC;

-- ============================================================================
-- STEP 10: Helper queries (save these as stored procedures or use in code)
-- ============================================================================

-- Query 1: Get all units for a specific item with conversion display
-- Replace ? with item_id
/*
SELECT 
    iu.id,
    iu.unit_name,
    u.name as master_unit_name,
    iu.conversion_factor,
    iu.is_base_unit,
    iu.is_purchase_unit,
    iu.is_sale_unit,
    CASE 
        WHEN iu.is_base_unit = 1 THEN iu.unit_name || ' (Base Unit)'
        ELSE '1 ' || iu.unit_name || ' = ' || iu.conversion_factor || ' ' || 
             (SELECT unit_name FROM item_units WHERE item_id = ? AND is_base_unit = 1)
    END as conversion_display
FROM item_units iu
LEFT JOIN units u ON iu.unit_id = u.id
WHERE iu.item_id = ? AND iu.status_code = 0
ORDER BY iu.conversion_factor ASC;
*/

-- Query 2: Get available master units not yet assigned to an item
/*
SELECT u.id, u.name
FROM units u
WHERE u.status_code = 0
AND u.id NOT IN (
    SELECT unit_id 
    FROM item_units 
    WHERE item_id = ? AND unit_id IS NOT NULL
)
ORDER BY u.name;
*/

-- Query 3: Calculate stock in all units for an item
/*
SELECT 
    i.id,
    i.name,
    i.current_stock as stock_in_base_unit,
    iu.unit_name,
    CAST(i.current_stock / iu.conversion_factor AS INTEGER) as full_units,
    (i.current_stock % CAST(iu.conversion_factor AS INTEGER)) as remaining_pieces,
    ROUND(CAST(i.current_stock AS REAL) / iu.conversion_factor, 3) as exact_units,
    iu.conversion_factor
FROM items i
JOIN item_units iu ON i.id = iu.item_id
WHERE i.id = ? AND iu.status_code = 0
ORDER BY iu.conversion_factor ASC;
*/

-- Query 4: Get base unit for an item
/*
SELECT 
    iu.id,
    iu.unit_name,
    iu.conversion_factor
FROM item_units iu
WHERE iu.item_id = ? AND iu.is_base_unit = 1 AND iu.status_code = 0
LIMIT 1;
*/

-- Query 5: Convert quantity from one unit to another
/*
WITH unit_from AS (
    SELECT conversion_factor FROM item_units WHERE id = ? -- from_unit_id
),
unit_to AS (
    SELECT conversion_factor FROM item_units WHERE id = ? -- to_unit_id
)
SELECT 
    ? * unit_from.conversion_factor / unit_to.conversion_factor as converted_quantity
FROM unit_from, unit_to;
*/

-- ============================================================================
-- STEP 11: Create triggers for automatic stock updates
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_purchase_stock_update;
DROP TRIGGER IF EXISTS trg_sale_stock_update;
DROP TRIGGER IF EXISTS trg_purchase_stock_delete;
DROP TRIGGER IF EXISTS trg_sale_stock_delete;

-- Trigger 1: Update stock when purchase item is inserted
CREATE TRIGGER trg_purchase_stock_update
AFTER INSERT ON purchase_items
BEGIN
    UPDATE items 
    SET current_stock = current_stock + (
        NEW.quantity * COALESCE(
            (SELECT conversion_factor FROM item_units WHERE id = NEW.unit_id),
            1.0
        )
    ),
    last_purchase_date = (SELECT purchase_date FROM purchases WHERE id = NEW.purchase_id),
    last_supplier_id = (SELECT supplier_id FROM purchases WHERE id = NEW.purchase_id),
    purchase_rate = NEW.unit_price / COALESCE(
            (SELECT conversion_factor FROM item_units WHERE id = NEW.unit_id),
            1.0
        )
    WHERE id = NEW.item_id;
END;

-- Trigger 2: Update stock when sale item is inserted
CREATE TRIGGER trg_sale_stock_update
AFTER INSERT ON sale_items
BEGIN
    UPDATE items 
    SET current_stock = current_stock - (
        NEW.quantity * COALESCE(
            (SELECT conversion_factor FROM item_units WHERE id = NEW.unit_id),
            1.0
        )
    )
    WHERE id = NEW.item_id;
END;

-- Trigger 3: Restore stock when purchase item is deleted
CREATE TRIGGER trg_purchase_stock_delete
AFTER DELETE ON purchase_items
BEGIN
    UPDATE items 
    SET current_stock = current_stock - (
        OLD.quantity * COALESCE(
            (SELECT conversion_factor FROM item_units WHERE id = OLD.unit_id),
            1.0
        )
    )
    WHERE id = OLD.item_id;
END;

-- Trigger 4: Restore stock when sale item is deleted
CREATE TRIGGER trg_sale_stock_delete
AFTER DELETE ON sale_items
BEGIN
    UPDATE items 
    SET current_stock = current_stock + (
        OLD.quantity * COALESCE(
            (SELECT conversion_factor FROM item_units WHERE id = OLD.unit_id),
            1.0
        )
    )
    WHERE id = OLD.item_id;
END;

-- ============================================================================
-- STEP 12: Sample data for testing
-- ============================================================================

-- Example 1: Coca Cola with multiple units
/*
-- Assume item_id = 1 for Coca Cola
-- Base unit: piece (already created in migration)

-- Add Dozen unit (1 Dozen = 12 pieces)
INSERT INTO item_units (item_id, unit_id, unit_name, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT 1, id, 'dozen', 12.0, 1, 1 FROM units WHERE name = 'dozen';

-- Add Box unit (1 Box = 24 pieces)
INSERT INTO item_units (item_id, unit_id, unit_name, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT 1, id, 'box', 24.0, 1, 1 FROM units WHERE name = 'box';

-- Add Carton unit (1 Carton = 288 pieces)
INSERT INTO item_units (item_id, unit_id, unit_name, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT 1, id, 'carton', 288.0, 1, 0 FROM units WHERE name = 'carton';
*/

-- Example 2: Biscuit with different box conversion
/*
-- Assume item_id = 2 for Biscuit
-- Base unit: piece (already created in migration)

-- Add Box unit (1 Box = 48 pieces) - DIFFERENT from Coca Cola!
INSERT INTO item_units (item_id, unit_id, unit_name, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT 2, id, 'box', 48.0, 1, 1 FROM units WHERE name = 'box';

-- Add Carton unit (1 Carton = 576 pieces)
INSERT INTO item_units (item_id, unit_id, unit_name, conversion_factor, is_purchase_unit, is_sale_unit)
SELECT 2, id, 'carton', 576.0, 1, 0 FROM units WHERE name = 'carton';
*/

-- ============================================================================
-- STEP 13: Validation queries
-- ============================================================================

-- Check if migration worked
-- SELECT COUNT(*) as items_without_base_unit FROM items i 
-- WHERE NOT EXISTS (SELECT 1 FROM item_units WHERE item_id = i.id AND is_base_unit = 1);

-- View all items with their units
-- SELECT * FROM v_item_units ORDER BY item_id, conversion_factor;

-- Check for items with no units
-- SELECT i.* FROM items i 
-- LEFT JOIN item_units iu ON i.id = iu.item_id 
-- WHERE iu.id IS NULL;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================