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

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

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

CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);

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

CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id INTEGER REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(menu_item_id, modifier_group_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_modifier_groups_modifier_group_id ON menu_item_modifier_groups(modifier_group_id);

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

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id);

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

CREATE INDEX IF NOT EXISTS idx_favorite_orders_user_id ON favorite_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_orders_order_id ON favorite_orders(order_id);

CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  last4 VARCHAR(4),
  brand VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

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

CREATE INDEX IF NOT EXISTS idx_employee_schedules_restaurant_id ON employee_schedules(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_user_id ON employee_schedules(user_id);

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ============================================================================
-- RLS POLICIES & SECURITY
-- ============================================================================

-- 1. Helper Functions
-- ----------------------------------------------------------------------------

-- Get current authenticated user's ID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

-- Check if user is a global owner (owns any restaurant)
CREATE OR REPLACE FUNCTION public.is_global_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    AND r.name = 'owner'
  );
$$;

-- Check if user owns a specific restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(restaurant_uuid INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_restaurants ur
    WHERE ur.restaurant_id = restaurant_uuid
    AND ur.user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
  );
$$;

-- Check reservation expiration (used by cron job)
CREATE OR REPLACE FUNCTION public.check_reservation_expiration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'tentative'
  AND expires_at < NOW();
END;
$$;

-- Seed developer function (if needed for testing)
CREATE OR REPLACE FUNCTION public.seed_developer()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Your seed logic here
  NULL;
END;
$$;

-- 2. Extension Mv 
-- Note: 'ALTER EXTENSION' commands not typically kept in schema dump unless strictly needed, 
-- but ensuring 'extensions' schema is good practice.
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. RLS Policies (Complete)
-- ----------------------------------------------------------------------------

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (
    email = (SELECT auth.email())  -- Optimization: wrap auth call
    OR public.is_global_owner()
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (email = (SELECT auth.email()));

-- ORDERS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
  );

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (
    public.is_restaurant_owner(restaurant_id)
  );

-- ORDER_ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND (
        o.user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
        OR public.is_restaurant_owner(o.restaurant_id)
      )
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND o.user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    )
  );

-- RESERVATIONS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select" ON public.reservations
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "reservations_insert" ON public.reservations
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
  );

CREATE POLICY "reservations_update" ON public.reservations
  FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "reservations_delete" ON public.reservations
  FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_restaurant_owner(restaurant_id)
  );

-- WEBHOOK_EVENTS (backend only - no client access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_deny_all" ON public.webhook_events
  FOR ALL USING (false);


-- ROLES
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert" ON public.roles FOR INSERT WITH CHECK (public.is_global_owner());
CREATE POLICY "roles_update" ON public.roles FOR UPDATE USING (public.is_global_owner());
CREATE POLICY "roles_delete" ON public.roles FOR DELETE USING (public.is_global_owner());

-- USER_ROLES
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_global_owner()
  );
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT WITH CHECK (public.is_global_owner());
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE USING (public.is_global_owner());
CREATE POLICY "user_roles_delete" ON public.user_roles FOR DELETE USING (public.is_global_owner());

-- USER_RESTAURANTS
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_restaurants_select" ON public.user_restaurants
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_global_owner()
  );
CREATE POLICY "user_restaurants_insert" ON public.user_restaurants FOR INSERT WITH CHECK (public.is_global_owner());
CREATE POLICY "user_restaurants_update" ON public.user_restaurants FOR UPDATE USING (public.is_global_owner());
CREATE POLICY "user_restaurants_delete" ON public.user_restaurants FOR DELETE USING (public.is_global_owner());

-- FAVORITE_ORDERS
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorite_orders_select" ON public.favorite_orders FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "favorite_orders_insert" ON public.favorite_orders FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "favorite_orders_update" ON public.favorite_orders FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "favorite_orders_delete" ON public.favorite_orders FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);

-- PAYMENT_METHODS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_select" ON public.payment_methods FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "payment_methods_insert" ON public.payment_methods FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "payment_methods_update" ON public.payment_methods FOR UPDATE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);
CREATE POLICY "payment_methods_delete" ON public.payment_methods FOR DELETE USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
);

-- MENU_CATEGORIES
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_categories_select" ON public.menu_categories
  FOR SELECT USING (true);
CREATE POLICY "menu_categories_insert" ON public.menu_categories FOR INSERT WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "menu_categories_update" ON public.menu_categories FOR UPDATE USING (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "menu_categories_delete" ON public.menu_categories FOR DELETE USING (public.is_restaurant_owner(restaurant_id));

-- MODIFIER_GROUPS
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifier_groups_select" ON public.modifier_groups
  FOR SELECT USING (true);
CREATE POLICY "modifier_groups_insert" ON public.modifier_groups FOR INSERT WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "modifier_groups_update" ON public.modifier_groups FOR UPDATE USING (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "modifier_groups_delete" ON public.modifier_groups FOR DELETE USING (public.is_restaurant_owner(restaurant_id));

-- MODIFIERS
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modifiers_select" ON public.modifiers
  FOR SELECT USING (true);
CREATE POLICY "modifiers_insert" ON public.modifiers FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
      AND public.is_restaurant_owner(mg.restaurant_id)
    )
);
CREATE POLICY "modifiers_update" ON public.modifiers FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
      AND public.is_restaurant_owner(mg.restaurant_id)
    )
);
CREATE POLICY "modifiers_delete" ON public.modifiers FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.modifier_groups mg
      WHERE mg.id = group_id
      AND public.is_restaurant_owner(mg.restaurant_id)
    )
);

-- MENU_ITEM_MODIFIER_GROUPS
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_item_modifier_groups_select" ON public.menu_item_modifier_groups
  FOR SELECT USING (true);
CREATE POLICY "menu_item_modifier_groups_insert" ON public.menu_item_modifier_groups FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_id
      AND public.is_restaurant_owner(mi.restaurant_id)
    )
);
CREATE POLICY "menu_item_modifier_groups_update" ON public.menu_item_modifier_groups FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_id
      AND public.is_restaurant_owner(mi.restaurant_id)
    )
);
CREATE POLICY "menu_item_modifier_groups_delete" ON public.menu_item_modifier_groups FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_id
      AND public.is_restaurant_owner(mi.restaurant_id)
    )
);

-- EMPLOYEE_SCHEDULES
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_schedules_select" ON public.employee_schedules
  FOR SELECT USING (
    user_id = (SELECT id FROM public.users WHERE email = (SELECT auth.email()))
    OR public.is_restaurant_owner(restaurant_id)
  );
CREATE POLICY "employee_schedules_insert" ON public.employee_schedules FOR INSERT WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "employee_schedules_update" ON public.employee_schedules FOR UPDATE USING (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "employee_schedules_delete" ON public.employee_schedules FOR DELETE USING (public.is_restaurant_owner(restaurant_id));

-- RESTAURANTS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_select" ON restaurants FOR SELECT USING (true);
CREATE POLICY "restaurants_manage" ON restaurants FOR ALL 
  USING (public.is_restaurant_owner(id));

-- MENU_ITEMS (Re-enabling explicit RLS if not already covered)
-- Note: menu_items refers to direct table. Prior checks used constraints? 
-- Migration added these specifically.
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "menu_items_select" ON menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_manage" ON menu_items FOR ALL 
  USING (public.is_restaurant_owner(restaurant_id));

-- TABLES
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_select" ON tables FOR SELECT USING (true);
CREATE POLICY "tables_manage" ON tables FOR ALL 
  USING (public.is_restaurant_owner(restaurant_id));

-- Legacy/Convenience function to seed a developer by email
CREATE OR REPLACE FUNCTION public.seed_developer(dev_email VARCHAR)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  dev_user_id INT;
  dev_role_id INT;
BEGIN
  -- Ensure user exists (you must signup first or insert here)
  SELECT id INTO dev_user_id FROM public.users WHERE email = dev_email;
  
  IF dev_user_id IS NOT NULL THEN
    SELECT id INTO dev_role_id FROM public.roles WHERE name = 'developer';
    -- Assign role
    INSERT INTO public.user_roles (user_id, role_id) VALUES (dev_user_id, dev_role_id)
    ON CONFLICT DO NOTHING;
    -- Update legacy role column for backward compatibility
    UPDATE public.users SET role = 'developer' WHERE id = dev_user_id;
  END IF;
END;
$$;

-- Media Assets for Scalable Storage (Supabase 50MB Limit)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id INTEGER REFERENCES public.restaurants(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES public.users(id), -- Changed to public.users as auth.users isn't visible here
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    bucket_name TEXT DEFAULT 'assets-01',
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_restaurant ON public.media_assets(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_media_bucket ON public.media_assets(bucket_name);
