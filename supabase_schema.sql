-- Create Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  location TEXT, -- For weather integration
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Clothing Items table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., 'tops', 'bottoms', 'outerwear', 'shoes', 'accessories'
  color TEXT,
  image_url TEXT,
  occasion TEXT[], -- e.g., ['formal', 'casual', 'workout']
  price NUMERIC DEFAULT 0, -- For CPW
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  brand TEXT,
  material TEXT,
  is_wishlist BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Outfits table
CREATE TABLE outfits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for Outfit Items
CREATE TABLE outfit_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  outfit_id UUID REFERENCES outfits ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items ON DELETE CASCADE NOT NULL
);

-- Wear Logs (The CPW Engine)
CREATE TABLE wear_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items ON DELETE CASCADE NOT NULL,
  outfit_id UUID REFERENCES outfits ON DELETE CASCADE,
  worn_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wear_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Items Policies
CREATE POLICY "Users can view their own items" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own items" ON items FOR DELETE USING (auth.uid() = user_id);

-- Outfits Policies
CREATE POLICY "Users can view their own outfits" ON outfits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own outfits" ON outfits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own outfits" ON outfits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own outfits" ON outfits FOR DELETE USING (auth.uid() = user_id);

-- Outfit Items Policies
CREATE POLICY "Users can view their own outfit items" ON outfit_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM outfits WHERE id = outfit_items.outfit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own outfit items" ON outfit_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM outfits WHERE id = outfit_items.outfit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own outfit items" ON outfit_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM outfits WHERE id = outfit_items.outfit_id AND user_id = auth.uid())
);

-- Wear Logs Policies
CREATE POLICY "Users can view their own wear logs" ON wear_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wear logs" ON wear_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own wear logs" ON wear_logs FOR DELETE USING (auth.uid() = user_id);
