-- Supabase Database Schema Setup for Trend Crafters
-- Copy this entire script and run it in the SQL Editor on Supabase (https://supabase.com)

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    fullname TEXT NOT NULL,
    email TEXT,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deactivated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    moq INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Custom B2B order ID (e.g. ORD-1234)
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(5, 2) DEFAULT 0 NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    shipping DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_link TEXT,
    button_text TEXT DEFAULT 'Pay Now' NOT NULL,
    open_in_new_tab BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Draft', 'Generated', 'Sent', 'Pending', 'Paid', 'Processing', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS Policies

-- Helper function to check if the current user is an admin.
-- Using SECURITY DEFINER to run with creator privileges, bypassing RLS
-- to prevent infinite recursion on the profiles table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies:
-- Allow select access only to the user themselves or to authorized admins
CREATE POLICY "Allow select access to own profile or admins" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- Allow users to insert their own profile
CREATE POLICY "Allow users to insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow admins to do everything on profiles
CREATE POLICY "Admins have full access to profiles" ON public.profiles
    ALL USING (public.is_admin());

-- Products Policies:
-- Allow anyone to read active products or allow admins full access
CREATE POLICY "Allow public read active products" ON public.products
    FOR SELECT USING (status = 'active' OR public.is_admin());

-- Allow admins to do everything on products
CREATE POLICY "Admins have full access to products" ON public.products
    ALL USING (public.is_admin());

-- Orders Policies:
-- Customers can view their own orders, admins can view all orders
CREATE POLICY "Allow users to select their own orders" ON public.orders
    FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());

-- Allow users to insert their own orders
CREATE POLICY "Allow users to insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Allow admins to do everything on orders
CREATE POLICY "Admins have full access to orders" ON public.orders
    ALL USING (public.is_admin());



-- 5. Trigger to handle new user registration in auth.users
-- This automatically inserts a new profile row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, fullname, email, business_name, business_type, phone, country, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'fullname', 'B2B Partner'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'businessName', 'New Company'),
    COALESCE(NEW.raw_user_meta_data->>'businessType', 'Wholesale'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'US'),
    'user',
    'pending' -- default B2B status
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Security Triggers on Profiles to prevent privilege escalation
-- Prevent non-admin users from changing their own role or status
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_profile_updates_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_updates();

-- Force role to 'user' and status to 'pending' on registration inserts
CREATE OR REPLACE FUNCTION public.clean_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    IF NOT public.is_admin() THEN
      NEW.role := 'user';
      NEW.status := 'pending';
    END IF;
  ELSE
    -- Bootstrap the first user as admin if no admin exists
    IF NEW.role IS NULL THEN
      NEW.role := 'user';
    END IF;
    IF NEW.status IS NULL THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER clean_new_profile_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.clean_new_profile();


-- Insert Sample Products into the products table
INSERT INTO public.products (name, sku, category, description, image, base_price, moq, status)
VALUES 
('Urban Essential T-Shirt', 'TC-TSH-001', 'Apparel', 'Premium heavy-weight cotton t-shirt for urban brands.', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1000', 29.99, 100, 'active'),
('Velocity Pro Sneakers', 'TC-SNK-002', 'Footwear', 'High-performance sneakers with breathable mesh.', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000', 129.99, 50, 'active')
ON CONFLICT (sku) DO NOTHING;

