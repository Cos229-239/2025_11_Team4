-- OrderEasy Database Schema
-- Multi-Restaurant System

-- Create a schema for extensions if it doesn't exist (Security Best Practice)
CREATE SCHEMA IF NOT EXISTS extensions;

-- Enable btree_gist extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

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

-- Example Policy: Allow public read access to restaurants
CREATE POLICY "Allow public read access" ON restaurants FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type ON restaurants(cuisine_type);
-- ============================================================================
-- RBAC: ROLES & PERMISSIONS (NEW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, 
  description TEXT
);

-- Seed default roles
INSERT INTO roles (name, description) VALUES
('developer', 'Super Admin: Access to everything'),
('owner', 'Restaurant Owner: Access to specific restaurants'),
('employee', 'Kitchen Staff: Limited access to specific restaurant orders'),
('customer', 'Regular end user')
ON CONFLICT (name) DO NOTHING;

-- User Roles (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Example Policy: Allow public read access to menu items
CREATE POLICY "Allow public read access" ON menu_items FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);

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

-- Enable RLS
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Example Policy: Allow public read access to tables
CREATE POLICY "Allow public read access" ON tables FOR SELECT USING (true);

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
  payment_id VARCHAR(255),
  confirmed_at TIMESTAMP,
  expires_at TIMESTAMP,
  has_pre_order BOOLEAN DEFAULT FALSE,
  customer_arrived BOOLEAN DEFAULT FALSE,
  arrival_time TIMESTAMP,
  kitchen_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_reservation_status CHECK (status IN ('pending', 'tentative', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show', 'expired'))
);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_rest_date_status ON reservations(restaurant_id, reservation_date, status);

-- Prevent overlapping active reservations for the same table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_start TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time)) STORED,
  ADD COLUMN IF NOT EXISTS reservation_end   TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time + interval '90 minutes')) STORED;

ALTER TABLE reservations DROP COLUMN IF EXISTS active_window;
ALTER TABLE reservations
  ADD COLUMN active_window TSRANGE GENERATED ALWAYS AS (
    CASE WHEN status IN ('cancelled','completed','no-show','expired') THEN NULL
         ELSE tsrange((reservation_date::timestamp + reservation_time),
                      (reservation_date::timestamp + reservation_time + interval '90 minutes'))
    END
  ) STORED;

DO $$
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ============================================================================
-- SETTINGS & WEBHOOK LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_settings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  cancellation_window_hours INTEGER DEFAULT 12,
  reservation_duration_minutes INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON reservation_settings FOR SELECT USING (true);


CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Drop functions first to avoid conflicts
DROP FUNCTION IF EXISTS check_reservation_conflicts(integer, integer, date, time without time zone, integer);
DROP FUNCTION IF EXISTS cleanup_expired_reservations();
DROP FUNCTION IF EXISTS seed_developer(varchar);

-- Function to check reservation conflicts
CREATE OR REPLACE FUNCTION check_reservation_conflicts(
  p_reservation_id INT,
  p_table_id INT,
  p_reservation_date DATE,
  p_reservation_time TIME,
  p_buffer_minutes INT
)
RETURNS TABLE (
  conflicting_id INT,
  conflicting_status VARCHAR,
  conflicting_time TIME
) 
LANGUAGE plpgsql 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, status, reservation_time
  FROM reservations
  WHERE table_id = p_table_id
    AND reservation_date = p_reservation_date
    AND id != p_reservation_id
    AND status IN ('confirmed', 'seated')
    AND (
      (reservation_time <= p_reservation_time AND (p_reservation_time - reservation_time) < (p_buffer_minutes || ' minutes')::interval)
      OR
      (reservation_time > p_reservation_time AND (reservation_time - p_reservation_time) < (p_buffer_minutes || ' minutes')::interval)
    );
END;
$$;

-- Function to cleanup expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS TABLE (expired_count INT, expired_ids INT[]) 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _expired_ids INT[];
BEGIN
  WITH expired_rows AS (
    UPDATE reservations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'tentative'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT array_agg(id) INTO _expired_ids FROM expired_rows;

  RETURN QUERY SELECT array_length(_expired_ids, 1), _expired_ids;
END;
$$;

-- NEW: Helper Function to Seed Developer Account (RBAC)
CREATE OR REPLACE FUNCTION seed_developer(dev_email VARCHAR) RETURNS void AS $$
DECLARE
  dev_user_id INT;
  dev_role_id INT;
BEGIN
  -- Ensure user exists (you must signup first or insert here)
  SELECT id INTO dev_user_id FROM users WHERE email = dev_email;
  
  IF dev_user_id IS NOT NULL THEN
    SELECT id INTO dev_role_id FROM roles WHERE name = 'developer';
    -- Assign role
    INSERT INTO user_roles (user_id, role_id) VALUES (dev_user_id, dev_role_id)
    ON CONFLICT DO NOTHING;
    -- Update legacy role column for backward compatibility
    UPDATE users SET role = 'developer' WHERE id = dev_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
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

-- Seed coordinates
UPDATE restaurants SET latitude = 37.774900, longitude = -122.419400 WHERE name = 'OrderEasy Restaurant' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 40.722000, longitude = -73.995000 WHERE name = 'Bella Italia' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 34.052200, longitude = -118.243700 WHERE name = 'Sakura Sushi Bar' AND (latitude IS NULL OR longitude IS NULL);

-- Seed Menu Items (partial)
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (1, 'Margherita Pizza', 'Classic tomato sauce, mozzarella, and fresh basil', 12.99, 'Pizza', true),
  (1, 'Pepperoni Pizza', 'Tomato sauce, mozzarella, and pepperoni', 14.99, 'Pizza', true),
  (1, 'Caesar Salad', 'Romaine lettuce, croutons, parmesan cheese, and Caesar dressing', 8.99, 'Salads', true),
  (1, 'Cheeseburger', 'Beef patty, cheddar cheese, lettuce, tomato, and pickles', 11.99, 'Burgers', true)
  has_pre_order BOOLEAN DEFAULT FALSE,
  customer_arrived BOOLEAN DEFAULT FALSE,
  arrival_time TIMESTAMP,
  kitchen_notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_reservation_status CHECK (status IN ('pending', 'tentative', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show', 'expired'))
);

-- Enable RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_id ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table_id ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_datetime ON reservations(reservation_date, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_rest_date_status ON reservations(restaurant_id, reservation_date, status);

-- Prevent overlapping active reservations for the same table
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_start TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time)) STORED,
  ADD COLUMN IF NOT EXISTS reservation_end   TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time + interval '90 minutes')) STORED;

ALTER TABLE reservations DROP COLUMN IF EXISTS active_window;
ALTER TABLE reservations
  ADD COLUMN active_window TSRANGE GENERATED ALWAYS AS (
    CASE WHEN status IN ('cancelled','completed','no-show','expired') THEN NULL
         ELSE tsrange((reservation_date::timestamp + reservation_time),
                      (reservation_date::timestamp + reservation_time + interval '90 minutes'))
    END
  ) STORED;

DO $$
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ============================================================================
-- SETTINGS & WEBHOOK LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_settings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  cancellation_window_hours INTEGER DEFAULT 12,
  reservation_duration_minutes INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON reservation_settings FOR SELECT USING (true);


CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Drop functions first to avoid conflicts
DROP FUNCTION IF EXISTS check_reservation_conflicts(integer, integer, date, time without time zone, integer);
DROP FUNCTION IF EXISTS cleanup_expired_reservations();
DROP FUNCTION IF EXISTS seed_developer(varchar);

-- Function to check reservation conflicts
CREATE OR REPLACE FUNCTION check_reservation_conflicts(
  p_reservation_id INT,
  p_table_id INT,
  p_reservation_date DATE,
  p_reservation_time TIME,
  p_buffer_minutes INT
)
RETURNS TABLE (
  conflicting_id INT,
  conflicting_status VARCHAR,
  conflicting_time TIME
) 
LANGUAGE plpgsql 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id, status, reservation_time
  FROM reservations
  WHERE table_id = p_table_id
    AND reservation_date = p_reservation_date
    AND id != p_reservation_id
    AND status IN ('confirmed', 'seated')
    AND (
      (reservation_time <= p_reservation_time AND (p_reservation_time - reservation_time) < (p_buffer_minutes || ' minutes')::interval)
      OR
      (reservation_time > p_reservation_time AND (reservation_time - p_reservation_time) < (p_buffer_minutes || ' minutes')::interval)
    );
END;
$$;

-- Function to cleanup expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS TABLE (expired_count INT, expired_ids INT[]) 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _expired_ids INT[];
BEGIN
  WITH expired_rows AS (
    UPDATE reservations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'tentative'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT array_agg(id) INTO _expired_ids FROM expired_rows;

  RETURN QUERY SELECT array_length(_expired_ids, 1), _expired_ids;
END;
$$;

-- NEW: Helper Function to Seed Developer Account (RBAC)
CREATE OR REPLACE FUNCTION seed_developer(dev_email VARCHAR) RETURNS void AS $$
DECLARE
  dev_user_id INT;
  dev_role_id INT;
BEGIN
  -- Ensure user exists (you must signup first or insert here)
  SELECT id INTO dev_user_id FROM users WHERE email = dev_email;
  
  IF dev_user_id IS NOT NULL THEN
    SELECT id INTO dev_role_id FROM roles WHERE name = 'developer';
    -- Assign role
    INSERT INTO user_roles (user_id, role_id) VALUES (dev_user_id, dev_role_id)
    ON CONFLICT DO NOTHING;
    -- Update legacy role column for backward compatibility
    UPDATE users SET role = 'developer' WHERE id = dev_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA
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

-- Seed coordinates
UPDATE restaurants SET latitude = 37.774900, longitude = -122.419400 WHERE name = 'OrderEasy Restaurant' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 40.722000, longitude = -73.995000 WHERE name = 'Bella Italia' AND (latitude IS NULL OR longitude IS NULL);
UPDATE restaurants SET latitude = 34.052200, longitude = -118.243700 WHERE name = 'Sakura Sushi Bar' AND (latitude IS NULL OR longitude IS NULL);

-- Seed Menu Items (partial)
INSERT INTO menu_items (restaurant_id, name, description, price, category, available) VALUES
  (1, 'Margherita Pizza', 'Classic tomato sauce, mozzarella, and fresh basil', 12.99, 'Pizza', true),
  (1, 'Pepperoni Pizza', 'Tomato sauce, mozzarella, and pepperoni', 14.99, 'Pizza', true),
  (1, 'Caesar Salad', 'Romaine lettuce, croutons, parmesan cheese, and Caesar dressing', 8.99, 'Salads', true),
  (1, 'Cheeseburger', 'Beef patty, cheddar cheese, lettuce, tomato, and pickles', 11.99, 'Burgers', true)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Seed Tables (partial)
INSERT INTO tables (restaurant_id, table_number, capacity, status) VALUES
  (1, 1, 2, 'available'), (1, 2, 2, 'available'), (1, 3, 4, 'available'), (1, 4, 4, 'reserved'),
  (1, 5, 4, 'occupied'), (1, 6, 6, 'available'), (2, 1, 2, 'available'), (2, 2, 2, 'reserved')
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- ============================================================================
-- ORDERS TABLE UPDATE
-- ============================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0.00;