-- OrderEasy Database Schema
-- Multi-Restaurant System
-- Run this file to set up the database tables

-- ============================================================================
-- RESTAURANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  opening_hours JSONB DEFAULT '{}',
  rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_restaurant_status CHECK (status IN ('active', 'inactive', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type ON restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating);

-- Geo support for proximity filtering
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- ============================================================================
-- USERS (BASIC PROFILES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(150) UNIQUE,
  role VARCHAR(50) DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auth support: password hash (nullable for legacy/demo users)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- ============================================================================
-- MENU ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);

-- ============================================================================
-- SAMPLE RESTAURANTS DATA
-- ============================================================================
INSERT INTO restaurants (name, description, cuisine_type, address, phone, email, rating, status, opening_hours) VALUES
  (
    'OrderEasy Restaurant',
    'Your favorite local spot with fresh, made-to-order dishes and a cozy atmosphere',
    'American',
    '123 Main Street, Downtown',
    '(555) 123-4567',
    'info@ordereasy.com',
    4.8,
    'active',
    '{"monday": {"open": "11:00", "close": "22:00"}, "tuesday": {"open": "11:00", "close": "22:00"}, "wednesday": {"open": "11:00", "close": "22:00"}, "thursday": {"open": "11:00", "close": "22:00"}, "friday": {"open": "11:00", "close": "23:00"}, "saturday": {"open": "10:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "21:00"}}'::jsonb
  ),
  (
    'Bella Italia',
    'Authentic Italian cuisine with wood-fired pizzas and homemade pasta',
    'Italian',
    '456 Oak Avenue, Little Italy',
    '(555) 234-5678',
    'contact@bellaitalia.com',
    4.7,
    'active',
    '{"monday": {"open": "12:00", "close": "22:00"}, "tuesday": {"open": "12:00", "close": "22:00"}, "wednesday": {"open": "12:00", "close": "22:00"}, "thursday": {"open": "12:00", "close": "22:00"}, "friday": {"open": "12:00", "close": "23:00"}, "saturday": {"open": "12:00", "close": "23:00"}, "sunday": "closed"}'::jsonb
  ),
  (
    'Sakura Sushi Bar',
    'Fresh sushi and Japanese specialties in a modern setting',
    'Japanese',
    '789 Cherry Lane, Arts District',
    '(555) 345-6789',
    'hello@sakurasushi.com',
    4.9,
    'active',
    '{"monday": {"open": "17:00", "close": "22:00"}, "tuesday": {"open": "17:00", "close": "22:00"}, "wednesday": {"open": "17:00", "close": "22:00"}, "thursday": {"open": "17:00", "close": "22:00"}, "friday": {"open": "17:00", "close": "23:00"}, "saturday": {"open": "12:00", "close": "23:00"}, "sunday": {"open": "12:00", "close": "21:00"}}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Seed approximate coordinates for demo (for proximity filtering)
UPDATE restaurants SET latitude = 37.774900, longitude = -122.419400 WHERE name = 'OrderEasy Restaurant' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 40.722000, longitude = -73.995000 WHERE name = 'Bella Italia' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 34.052200, longitude = -118.243700 WHERE name = 'Sakura Sushi Bar' AND (latitude IS NULL OR longitude IS NULL);

-- ============================================================================
-- SAMPLE MENU ITEMS DATA
-- ============================================================================

-- OrderEasy Restaurant Menu
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (1, 'Margherita Pizza', 'Classic tomato sauce, mozzarella, and fresh basil', 12.99, 'Pizza', true),
  (1, 'Pepperoni Pizza', 'Tomato sauce, mozzarella, and pepperoni', 14.99, 'Pizza', true),
  (1, 'Caesar Salad', 'Romaine lettuce, croutons, parmesan cheese, and Caesar dressing', 8.99, 'Salads', true),
  (1, 'Greek Salad', 'Mixed greens, feta cheese, olives, tomatoes, and cucumbers', 9.99, 'Salads', true),
  (1, 'Cheeseburger', 'Beef patty, cheddar cheese, lettuce, tomato, and pickles', 11.99, 'Burgers', true),
  (1, 'Chicken Burger', 'Grilled chicken breast, lettuce, tomato, and mayo', 10.99, 'Burgers', true),
  (1, 'Spaghetti Carbonara', 'Pasta with bacon, egg, and parmesan cheese', 13.99, 'Pasta', true),
  (1, 'Penne Arrabiata', 'Penne pasta in spicy tomato sauce', 12.99, 'Pasta', true),
  (1, 'Coca Cola', 'Classic Coca Cola (330ml)', 2.99, 'Beverages', true),
  (1, 'Fresh Orange Juice', 'Freshly squeezed orange juice', 4.99, 'Beverages', true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Bella Italia Menu
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (2, 'Margherita Pizza', 'Classic tomato, mozzarella, and fresh basil', 14.99, 'Pizza', true),
  (2, 'Quattro Formaggi', 'Four cheese pizza with gorgonzola, mozzarella, parmesan, and fontina', 16.99, 'Pizza', true),
  (2, 'Spaghetti Carbonara', 'Classic Roman pasta with guanciale, egg, and pecorino', 15.99, 'Pasta', true),
  (2, 'Fettuccine Alfredo', 'Creamy parmesan sauce with fettuccine', 14.99, 'Pasta', true),
  (2, 'Tiramisu', 'Classic Italian dessert with espresso and mascarpone', 7.99, 'Desserts', true),
  (2, 'Caprese Salad', 'Fresh mozzarella, tomatoes, and basil', 9.99, 'Salads', true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Sakura Sushi Bar Menu
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (3, 'California Roll', 'Crab, avocado, and cucumber', 8.99, 'Rolls', true),
  (3, 'Spicy Tuna Roll', 'Tuna, spicy mayo, and cucumber', 10.99, 'Rolls', true),
  (3, 'Dragon Roll', 'Eel, avocado, and cucumber with eel sauce', 13.99, 'Rolls', true),
  (3, 'Salmon Nigiri', 'Fresh salmon over rice (2 pieces)', 6.99, 'Nigiri', true),
  (3, 'Tuna Nigiri', 'Fresh tuna over rice (2 pieces)', 7.99, 'Nigiri', true),
  (3, 'Miso Soup', 'Traditional Japanese soup with tofu and seaweed', 3.99, 'Appetizers', true),
  (3, 'Edamame', 'Steamed soybeans with sea salt', 4.99, 'Appetizers', true),
  (3, 'Sashimi Platter', 'Assorted fresh fish (chef''s choice)', 24.99, 'Sashimi', true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- ============================================================================
-- TABLES (PER RESTAURANT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'available',
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_table_status CHECK (status IN ('available','reserved','occupied','out-of-service')),
  UNIQUE(restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_number ON tables(restaurant_id, table_number);

-- ============================================================================
-- RESERVATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(100),
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_reservation_status CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no-show'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);

-- Safety: ensure user_id exists for previously-initialized DBs
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Prevent overlapping active reservations for the same table
-- Uses generated columns + exclusion constraint via btree_gist
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_start TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time)) STORED,
  ADD COLUMN IF NOT EXISTS reservation_end   TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time + interval '90 minutes')) STORED;

-- Recreate active_window to avoid referencing generated columns directly (Postgres restriction)
ALTER TABLE reservations DROP COLUMN IF EXISTS active_window;
ALTER TABLE reservations
  ADD COLUMN active_window TSRANGE GENERATED ALWAYS AS (
    CASE WHEN status IN ('cancelled','completed','no-show') THEN NULL
         ELSE tsrange((reservation_date::timestamp + reservation_time),
                      (reservation_date::timestamp + reservation_time + interval '90 minutes'))
    END
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap_per_table'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT no_overlap_per_table
      EXCLUDE USING GIST (
        table_id WITH =,
        active_window WITH &&
      );
  END IF;
END$$;

-- ============================================================================
-- ORDERS (WITH FKs TO RESTAURANTS, TABLES, RESERVATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
  table_id INTEGER NOT NULL REFERENCES tables(id) ON DELETE RESTRICT,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  order_type VARCHAR(50) DEFAULT 'dine-in',
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  customer_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  CONSTRAINT valid_order_type CHECK (order_type IN ('dine-in', 'pre-order', 'walk-in'))
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create order_items table (junction table for orders and menu items)
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  menu_item_name VARCHAR(255) NOT NULL,
  menu_item_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  special_instructions TEXT,
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ============================================================================
-- SEED TABLES PER RESTAURANT
-- ============================================================================
-- Insert tables for each restaurant (id 1..3), capacities vary, idempotent on (restaurant_id, table_number)
INSERT INTO tables (restaurant_id, table_number, capacity, status)
VALUES
  (1, 1, 2, 'available'), (1, 2, 2, 'available'), (1, 3, 4, 'available'), (1, 4, 4, 'reserved'),
  (1, 5, 4, 'occupied'), (1, 6, 6, 'available'), (1, 7, 6, 'out-of-service'), (1, 8, 2, 'available'),
  (2, 1, 2, 'available'), (2, 2, 2, 'reserved'), (2, 3, 4, 'available'), (2, 4, 4, 'occupied'),
  (2, 5, 4, 'available'), (2, 6, 6, 'available'), (2, 7, 6, 'available'), (2, 8, 2, 'available'), (2, 9, 2, 'available'), (2,10, 4, 'available'),
  (3, 1, 2, 'available'), (3, 2, 2, 'available'), (3, 3, 4, 'reserved'), (3, 4, 4, 'available'),
  (3, 5, 4, 'available'), (3, 6, 6, 'available'), (3, 7, 2, 'available'), (3, 8, 2, 'available')
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- ============================================================================
-- SEED RESERVATIONS (TODAY AND TOMORROW, MIXED STATUSES)
-- ============================================================================
DO $$
BEGIN
  -- R1 today confirmed 19:00, table 4
  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.restaurant_id = 1 AND r.reservation_date = CURRENT_DATE AND r.reservation_time = TIME '19:00' AND r.customer_name = 'John Doe'
  ) THEN
    INSERT INTO reservations (
      restaurant_id, table_id, customer_name, customer_phone, customer_email,
      party_size, reservation_date, reservation_time, status, special_requests
    )
    SELECT 1,
           (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=4),
           'John Doe', '(555) 111-2222', 'john@example.com',
           4, CURRENT_DATE, TIME '19:00', 'confirmed', 'Window seat if possible';
  END IF;

  -- R1 seated 18:30, table 5
  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.restaurant_id = 1 AND r.reservation_date = CURRENT_DATE AND r.reservation_time = TIME '18:30' AND r.customer_name = 'Alice Smith'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 1, (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=5), 'Alice Smith', 2, CURRENT_DATE, TIME '18:30', 'seated';
  END IF;

  -- R2 tomorrow pending 20:00, table 2
  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.restaurant_id = 2 AND r.reservation_date = CURRENT_DATE + INTERVAL '1 day' AND r.reservation_time = TIME '20:00' AND r.customer_name = 'Marco Rossi'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 2, (SELECT id FROM tables WHERE restaurant_id=2 AND table_number=2), 'Marco Rossi', 2, CURRENT_DATE + INTERVAL '1 day', TIME '20:00', 'pending';
  END IF;

  -- R3 today cancelled 21:00, table 3
  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.restaurant_id = 3 AND r.reservation_date = CURRENT_DATE AND r.reservation_time = TIME '21:00' AND r.customer_name = 'Sakura Guest'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 3, (SELECT id FROM tables WHERE restaurant_id=3 AND table_number=3), 'Sakura Guest', 3, CURRENT_DATE, TIME '21:00', 'cancelled';
  END IF;
END$$;

-- ============================================================================
-- SEED ORDERS + ITEMS (ACTIVE + COMPLETED/CANCELLED, SOME PRE-ORDERS)
-- ============================================================================
-- R1 pending order (table 1)
DO $$
DECLARE new_id INTEGER; BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R1 Pending') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 1,
             (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=1),
             NULL,
             'dine-in', 0, 'Seed R1 Pending', 'pending', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Margherita Pizza', 2), ('Caesar Salad', 1)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 1 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R1 Pending';
  END IF;
END$$;

-- R1 preparing order (table 3)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R1 Preparing') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 1, (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=3), NULL,
             'dine-in', 0, 'Seed R1 Preparing', 'preparing', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Pepperoni Pizza', 1), ('Coca Cola', 2)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 1 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R1 Preparing';
  END IF;
END$$;

-- R1 ready order (table 4)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R1 Ready') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 1, (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=4), NULL,
             'dine-in', 0, 'Seed R1 Ready', 'ready', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '2 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Penne Arrabiata', 1), ('Fresh Orange Juice', 1)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 1 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R1 Ready';
  END IF;
END$$;

-- R1 completed order (table 6)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R1 Completed') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 1, (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=6), NULL,
             'dine-in', 0, 'Seed R1 Completed', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 30 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Cheeseburger', 2), ('Coca Cola', 2)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 1 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R1 Completed';
  END IF;
END$$;

-- R2 preparing order (table 3)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R2 Preparing') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 2, (SELECT id FROM tables WHERE restaurant_id=2 AND table_number=3), NULL,
             'dine-in', 0, 'Seed R2 Preparing', 'preparing', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '5 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Quattro Formaggi', 1), ('Tiramisu', 1)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 2 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R2 Preparing';
  END IF;
END$$;

-- R3 pending order (table 1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R3 Pending') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 3, (SELECT id FROM tables WHERE restaurant_id=3 AND table_number=1), NULL,
             'dine-in', 0, 'Seed R3 Pending', 'pending', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('California Roll', 2), ('Miso Soup', 1)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 3 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R3 Pending';
  END IF;
END$$;

-- R1 pre-order linked to reservation (John Doe 19:00)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R1 Pre-Order for John Doe') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 1,
             (SELECT id FROM tables WHERE restaurant_id=1 AND table_number=4),
             (SELECT id FROM reservations WHERE restaurant_id=1 AND customer_name='John Doe' AND reservation_date=CURRENT_DATE AND reservation_time=TIME '19:00'),
             'pre-order', 0, 'Seed R1 Pre-Order for John Doe', 'pending', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '40 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Spaghetti Carbonara', 1), ('Fresh Orange Juice', 2)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 1 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R1 Pre-Order for John Doe';
  END IF;
END$$;

-- ============================================================================
-- EXTRA MENU ITEMS FOR A MORE REALISTIC CASE
-- ============================================================================
-- Bella Italia (id=2) — expand menu
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (2,'Bruschetta','Grilled bread with tomatoes, basil, olive oil',7.99,'Appetizers',true),
  (2,'Prosciutto e Melone','Prosciutto with cantaloupe',10.99,'Appetizers',true),
  (2,'Caprese','Tomato, fresh mozzarella, basil, balsamic',9.99,'Appetizers',true),
  (2,'Quattro Stagioni','Pizza with artichokes, ham, mushrooms, olives',17.99,'Pizza',true),
  (2,'Diavola','Spicy salami pizza',16.99,'Pizza',true),
  (2,'Frutti di Mare','Seafood pizza',18.99,'Pizza',true),
  (2,'Penne alla Vodka','Creamy tomato vodka sauce',16.49,'Pasta',true),
  (2,'Pesto Genovese','Basil pesto pasta',15.49,'Pasta',true),
  (2,'Ravioli Ricotta e Spinaci','Ricotta spinach ravioli with sage butter',17.49,'Pasta',true),
  (2,'Bistecca','Grilled steak with rosemary potatoes',24.99,'Entrees',true),
  (2,'Branzino al Forno','Oven-baked sea bass with lemon',23.99,'Entrees',true),
  (2,'Insalata Mista','Mixed greens salad',7.49,'Salads',true),
  (2,'Cannoli','Crispy shells with sweet ricotta',6.99,'Desserts',true),
  (2,'Gelato','Assorted flavors',5.99,'Desserts',true),
  (2,'Espresso','Single shot',2.99,'Beverages',true),
  (2,'Cappuccino','Espresso with steamed milk foam',3.99,'Beverages',true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Sakura Sushi Bar (id=3) — expand menu
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (3,'Gyoza','Pan-fried dumplings',6.99,'Appetizers',true),
  (3,'Seaweed Salad','Marinated seaweed salad',5.99,'Appetizers',true),
  (3,'Rainbow Roll','California roll topped with assorted fish',14.99,'Rolls',true),
  (3,'Philadelphia Roll','Salmon, cream cheese, cucumber',11.99,'Rolls',true),
  (3,'Shrimp Tempura Roll','Tempura shrimp, avocado, eel sauce',12.99,'Rolls',true),
  (3,'Unagi Nigiri','Freshwater eel over rice (2 pc)',8.99,'Nigiri',true),
  (3,'Tamago Nigiri','Sweet egg omelette (2 pc)',5.99,'Nigiri',true),
  (3,'Chef Sashimi','12 pcs chef selection',26.99,'Sashimi',true),
  (3,'Ramen Tonkotsu','Pork broth ramen',12.99,'Noodles',true),
  (3,'Chicken Katsu','Crispy chicken cutlet',13.99,'Entrees',true),
  (3,'Mochi Ice Cream','Assorted mochi',5.49,'Desserts',true),
  (3,'Hot Green Tea','Pot of tea',3.49,'Beverages',true),
  (3,'Ramune','Japanese soda',3.99,'Beverages',true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- ============================================================================
-- EXTRA RESERVATIONS (TODAY/TOMORROW) FOR RESTAURANTS 2 & 3
-- ============================================================================
DO $$
BEGIN
  -- R2 today confirmed 19:30, table 3
  IF NOT EXISTS (
    SELECT 1 FROM reservations r
    WHERE r.restaurant_id = 2 AND r.reservation_date = CURRENT_DATE AND r.reservation_time = TIME '19:30' AND r.customer_name = 'Giulia B'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 2, (SELECT id FROM tables WHERE restaurant_id=2 AND table_number=3), 'Giulia B', 4, CURRENT_DATE, TIME '19:30', 'confirmed';
  END IF;

  -- R2 today seated 18:00, table 4
  IF NOT EXISTS (
    SELECT 1 FROM reservations r WHERE r.restaurant_id=2 AND r.reservation_date=CURRENT_DATE AND r.reservation_time=TIME '18:00' AND r.customer_name='Paolo R'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 2, (SELECT id FROM tables WHERE restaurant_id=2 AND table_number=4), 'Paolo R', 2, CURRENT_DATE, TIME '18:00', 'seated';
  END IF;

  -- R3 tomorrow pending 18:30, table 4
  IF NOT EXISTS (
    SELECT 1 FROM reservations r WHERE r.restaurant_id=3 AND r.reservation_date=CURRENT_DATE + INTERVAL '1 day' AND r.reservation_time=TIME '18:30' AND r.customer_name='Kenji'
  ) THEN
    INSERT INTO reservations (restaurant_id, table_id, customer_name, party_size, reservation_date, reservation_time, status)
    SELECT 3, (SELECT id FROM tables WHERE restaurant_id=3 AND table_number=4), 'Kenji', 3, CURRENT_DATE + INTERVAL '1 day', TIME '18:30', 'pending';
  END IF;
END$$;

-- ============================================================================
-- EXTRA ORDERS FOR RESTAURANTS 2 & 3
-- ============================================================================
-- R2 ready order (table 5)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R2 Ready') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 2, (SELECT id FROM tables WHERE restaurant_id=2 AND table_number=5), NULL,
             'dine-in', 0, 'Seed R2 Ready', 'ready', NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '2 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Penne alla Vodka', 1), ('Espresso', 2)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 2 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R2 Ready';
  END IF;
END$$;

-- R3 preparing order (table 2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM orders WHERE customer_notes = 'Seed R3 Preparing') THEN
    WITH new_order AS (
      INSERT INTO orders (restaurant_id, table_id, reservation_id, order_type, total_amount, customer_notes, status, created_at, updated_at)
      SELECT 3, (SELECT id FROM tables WHERE restaurant_id=3 AND table_number=2), NULL,
             'dine-in', 0, 'Seed R3 Preparing', 'preparing', NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '6 minutes'
      RETURNING id
    )
    INSERT INTO order_items (order_id, menu_item_id, menu_item_name, menu_item_price, quantity, special_instructions, subtotal)
    SELECT n.id, mi.id, mi.name, mi.price, x.qty, '', mi.price * x.qty
    FROM new_order n
    JOIN LATERAL (
      VALUES ('Rainbow Roll', 1), ('Gyoza', 1)
    ) AS x(name, qty) ON TRUE
    JOIN menu_items mi ON mi.restaurant_id = 3 AND mi.name = x.name;

    UPDATE orders o SET total_amount = (
      SELECT COALESCE(SUM(subtotal),0) FROM order_items oi WHERE oi.order_id = o.id
    ) WHERE o.customer_notes = 'Seed R3 Preparing';
  END IF;
END$$;
