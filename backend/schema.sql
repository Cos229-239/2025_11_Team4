-- OrderEasy Database Schema
-- Multi-Restaurant System
-- Synced with Supabase: 2025-12-09

-- ============================================================================
-- EXTENSIONS & SETUP
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- ============================================================================
-- USERS & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, 
  description TEXT
);

INSERT INTO roles (name, description) VALUES
('developer', 'Super Admin: Access to everything'),
('owner', 'Restaurant Owner: Access to specific restaurants'),
('employee', 'Kitchen Staff: Limited access to specific restaurant orders'),
('customer', 'Regular end user')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'customer',
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMP,
  stripe_customer_id TEXT,
  
  -- Employee specific fields
  on_duty BOOLEAN DEFAULT false,
  hire_date DATE,
  position VARCHAR(100),
  emergency_contact TEXT,
  hourly_rate DECIMAL(10, 2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- RESTAURANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  logo_url TEXT,
  cover_image_url TEXT,
  website_url TEXT,
  social_media JSONB DEFAULT '{}',
  rating DECIMAL(3, 1) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  opening_hours JSONB,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_types TEXT[] DEFAULT '{dine-in}',
  accepts_reservations BOOLEAN DEFAULT true,
  accepts_online_orders BOOLEAN DEFAULT true,
  delivery_radius_km DECIMAL(5, 2),
  minimum_order_amount DECIMAL(10, 2),
  delivery_fee DECIMAL(10, 2),
  estimated_prep_time_minutes INTEGER DEFAULT 30,
  tax_rate DECIMAL(5, 4) DEFAULT 0.0875,
  service_charge_percent DECIMAL(5, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine_type ON restaurants(cuisine_type);

CREATE TABLE IF NOT EXISTS user_restaurants (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, restaurant_id)
);

-- ============================================================================
-- MENUS & MODIFIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  available_from TIME,
  available_until TIME,
  available_days TEXT[] DEFAULT '{monday,tuesday,wednesday,thursday,friday,saturday,sunday}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  selection_type VARCHAR(20) DEFAULT 'single', -- 'single', 'multiple'
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TABLE IF NOT EXISTS modifiers (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
  is_default BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  dietary_tags TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  calories INTEGER,
  prep_time_minutes INTEGER,
  spice_level INTEGER CHECK (spice_level >= 0 AND spice_level <= 5),
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id INTEGER REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(menu_item_id, modifier_group_id)
);

-- ============================================================================
-- TABLES & RESERVATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  section VARCHAR(50),
  location_x INTEGER,
  location_y INTEGER,
  shape VARCHAR(20) DEFAULT 'square',
  notes TEXT,
  min_capacity INTEGER,
  is_accessible BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'available',
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

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
  reservation_start TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time)) STORED,
  reservation_end TIMESTAMP GENERATED ALWAYS AS ((reservation_date::timestamp + reservation_time + interval '90 minutes')) STORED,
  -- active_window handled by Postgres logic usually, kept simple here
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservation_settings (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  cancellation_window_hours INTEGER DEFAULT 12,
  reservation_duration_minutes INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ORDERS & PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_type VARCHAR(50) DEFAULT 'dine-in',
  total_amount DECIMAL(10, 2) NOT NULL,
  tip_amount DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_intent_id VARCHAR(255),
  payment_amount DECIMAL(10, 2),
  scheduled_for TIMESTAMP,
  customer_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id), -- Nullable in definitions? NO, typically strict. 
  menu_item_name VARCHAR(255) NOT NULL,
  menu_item_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  special_instructions TEXT,
  subtotal DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS favorite_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SCHEDULING & WEBHOOKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role VARCHAR(50) DEFAULT 'server',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES (Examples)
-- ============================================================================
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON restaurants FOR SELECT USING (true);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON menu_items FOR SELECT USING (true);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON tables FOR SELECT USING (true);

-- Additional policies should be applied as needed for other tables.