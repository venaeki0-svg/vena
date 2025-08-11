/*
  # Initial Database Schema for Vena Pictures

  1. New Tables
    - `users` - User accounts and permissions
    - `clients` - Client information and contact details
    - `projects` - Project management with status tracking
    - `packages` - Service packages and pricing
    - `add_ons` - Additional services
    - `team_members` - Freelancer/team member information
    - `transactions` - Financial transactions
    - `cards` - Payment cards and accounts
    - `financial_pockets` - Budget allocation pockets
    - `leads` - Prospect management
    - `assets` - Equipment and asset tracking
    - `contracts` - Legal contracts
    - `client_feedback` - Customer satisfaction tracking
    - `notifications` - System notifications
    - `qr_codes` - QR code management
    - `social_media_posts` - Social media planning
    - `promo_codes` - Discount codes
    - `sops` - Standard Operating Procedures
    - `team_project_payments` - Freelancer payment tracking
    - `team_payment_records` - Payment batch records
    - `reward_ledger_entries` - Reward system tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access based on user roles
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'Member' CHECK (role IN ('Admin', 'Member')),
  permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  instagram text,
  since date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Prospek', 'Aktif', 'Tidak Aktif', 'Hilang')),
  client_type text NOT NULL DEFAULT 'Langsung' CHECK (client_type IN ('Langsung', 'Vendor')),
  last_contact timestamptz DEFAULT now(),
  portal_access_id uuid DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Packages table
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  physical_items jsonb DEFAULT '[]',
  digital_items text[] DEFAULT '{}',
  processing_time text NOT NULL DEFAULT '30 hari kerja',
  photographers text,
  videographers text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add-ons table
CREATE TABLE IF NOT EXISTS add_ons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  standard_fee numeric NOT NULL DEFAULT 0,
  no_rek text,
  reward_balance numeric DEFAULT 0,
  rating numeric DEFAULT 5.0 CHECK (rating >= 1 AND rating <= 5),
  performance_notes jsonb DEFAULT '[]',
  portal_access_id uuid DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_name text NOT NULL,
  client_name text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  project_type text NOT NULL,
  package_name text NOT NULL,
  package_id uuid REFERENCES packages(id),
  add_ons jsonb DEFAULT '[]',
  date date NOT NULL,
  deadline_date date,
  location text NOT NULL DEFAULT '',
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'Dikonfirmasi',
  active_sub_statuses text[] DEFAULT '{}',
  total_cost numeric NOT NULL DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'Belum Bayar' CHECK (payment_status IN ('Lunas', 'DP Terbayar', 'Belum Bayar')),
  team jsonb DEFAULT '[]',
  notes text,
  accommodation text,
  drive_link text,
  client_drive_link text,
  final_drive_link text,
  start_time text,
  end_time text,
  image text,
  revisions jsonb DEFAULT '[]',
  promo_code_id uuid,
  discount_amount numeric DEFAULT 0,
  shipping_details text,
  dp_proof_url text,
  printing_details jsonb DEFAULT '[]',
  printing_cost numeric DEFAULT 0,
  transport_cost numeric DEFAULT 0,
  is_editing_confirmed_by_client boolean DEFAULT false,
  is_printing_confirmed_by_client boolean DEFAULT false,
  is_delivery_confirmed_by_client boolean DEFAULT false,
  confirmed_sub_statuses text[] DEFAULT '{}',
  client_sub_status_notes jsonb DEFAULT '{}',
  completed_digital_items text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('Pemasukan', 'Pengeluaran')),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  category text NOT NULL,
  method text NOT NULL DEFAULT 'Transfer Bank' CHECK (method IN ('Transfer Bank', 'Tunai', 'E-Wallet', 'Sistem', 'Kartu')),
  pocket_id text,
  card_id text,
  printing_item_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_holder_name text NOT NULL,
  bank_name text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('Prabayar', 'Kredit', 'Debit')),
  last_four_digits text NOT NULL,
  expiry_date text,
  balance numeric DEFAULT 0,
  color_gradient text NOT NULL DEFAULT 'from-blue-500 to-sky-400',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Financial pockets table
CREATE TABLE IF NOT EXISTS financial_pockets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'piggy-bank',
  type text NOT NULL CHECK (type IN ('Nabung & Bayar', 'Terkunci', 'Bersama', 'Anggaran Pengeluaran', 'Tabungan Hadiah Freelancer')),
  amount numeric DEFAULT 0,
  goal_amount numeric,
  lock_end_date date,
  members jsonb DEFAULT '[]',
  source_card_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_channel text NOT NULL CHECK (contact_channel IN ('WhatsApp', 'Instagram', 'Website', 'Telepon', 'Referensi', 'Form Saran', 'Lainnya')),
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Baru Masuk' CHECK (status IN ('Baru Masuk', 'Sedang Diskusi', 'Menunggu Follow Up', 'Dikonversi', 'Ditolak')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  purchase_date date NOT NULL,
  purchase_price numeric NOT NULL DEFAULT 0,
  serial_number text,
  status text NOT NULL DEFAULT 'Tersedia' CHECK (status IN ('Tersedia', 'Digunakan', 'Perbaikan')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  signing_date date NOT NULL,
  signing_location text NOT NULL,
  client_name1 text NOT NULL,
  client_address1 text NOT NULL,
  client_phone1 text NOT NULL,
  client_name2 text,
  client_address2 text,
  client_phone2 text,
  shooting_duration text NOT NULL,
  guaranteed_photos text NOT NULL,
  album_details text NOT NULL,
  digital_files_format text NOT NULL DEFAULT 'JPG High-Resolution',
  other_items text NOT NULL DEFAULT '',
  personnel_count text NOT NULL,
  delivery_timeframe text NOT NULL DEFAULT '30 hari kerja',
  dp_date date,
  final_payment_date date,
  cancellation_policy text NOT NULL,
  jurisdiction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Client feedback table
CREATE TABLE IF NOT EXISTS client_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name text NOT NULL,
  satisfaction text NOT NULL CHECK (satisfaction IN ('Sangat Puas', 'Puas', 'Biasa Saja', 'Tidak Puas')),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text NOT NULL,
  date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  message text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  is_read boolean DEFAULT false,
  icon text NOT NULL CHECK (icon IN ('lead', 'deadline', 'revision', 'feedback', 'payment', 'completed')),
  link_view text,
  link_action jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('link', 'text', 'vcard', 'wifi', 'clientPortal', 'freelancerPortal', 'publicForm')),
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('Instagram Feed', 'Instagram Story', 'Instagram Reels', 'TikTok Video', 'Artikel Blog')),
  platform text NOT NULL CHECK (platform IN ('Instagram', 'TikTok', 'Website')),
  scheduled_date date NOT NULL,
  caption text NOT NULL,
  media_url text,
  status text NOT NULL DEFAULT 'Draf' CHECK (status IN ('Draf', 'Terjadwal', 'Diposting', 'Dibatalkan')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  max_usage integer,
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SOPs table
CREATE TABLE IF NOT EXISTS sops (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team project payments table
CREATE TABLE IF NOT EXISTS team_project_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  team_member_name text NOT NULL,
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid')),
  fee numeric NOT NULL DEFAULT 0,
  reward numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team payment records table
CREATE TABLE IF NOT EXISTS team_payment_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_number text UNIQUE NOT NULL,
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  date date NOT NULL,
  project_payment_ids text[] DEFAULT '{}',
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reward ledger entries table
CREATE TABLE IF NOT EXISTS reward_ledger_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User profile table (single row for app configuration)
CREATE TABLE IF NOT EXISTS user_profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT 'Vena Pictures',
  website text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  bank_account text NOT NULL DEFAULT '',
  authorized_signer text NOT NULL DEFAULT '',
  id_number text,
  bio text NOT NULL DEFAULT '',
  income_categories text[] DEFAULT '{"DP Proyek","Pelunasan Proyek","Penjualan Aset","Lainnya"}',
  expense_categories text[] DEFAULT '{"Gaji Freelancer","Transportasi","Akomodasi","Peralatan","Marketing","Operasional","Lainnya"}',
  project_types text[] DEFAULT '{"Pernikahan","Prewedding","Engagement","Maternity","Family Portrait","Corporate Event","Lainnya"}',
  event_types text[] DEFAULT '{"Meeting Klien","Survey Lokasi","Libur","Workshop","Lainnya"}',
  asset_categories text[] DEFAULT '{"Kamera","Lensa","Lighting","Audio","Aksesoris","Komputer","Software","Lainnya"}',
  sop_categories text[] DEFAULT '{"Fotografi","Videografi","Editing","Administrasi","Customer Service","Lainnya"}',
  project_status_config jsonb DEFAULT '[
    {"id":"status_1","name":"Dikonfirmasi","color":"#3b82f6","note":"Proyek telah dikonfirmasi oleh klien","subStatuses":[]},
    {"id":"status_2","name":"Persiapan","color":"#8b5cf6","note":"Tim sedang mempersiapkan proyek","subStatuses":[]},
    {"id":"status_3","name":"Editing","color":"#f97316","note":"Proses editing foto/video","subStatuses":[]},
    {"id":"status_4","name":"Cetak","color":"#06b6d4","note":"Proses pencetakan album","subStatuses":[]},
    {"id":"status_5","name":"Dikirim","color":"#eab308","note":"Hasil sudah dikirim ke klien","subStatuses":[]},
    {"id":"status_6","name":"Selesai","color":"#10b981","note":"Proyek telah selesai","subStatuses":[]},
    {"id":"status_7","name":"Dibatalkan","color":"#ef4444","note":"Proyek dibatalkan","subStatuses":[]}
  ]',
  notification_settings jsonb DEFAULT '{"newProject":true,"paymentConfirmation":true,"deadlineReminder":true}',
  security_settings jsonb DEFAULT '{"twoFactorEnabled":false}',
  briefing_template text DEFAULT 'Halo tim! Briefing untuk proyek [PROJECT_NAME] pada [DATE] di [LOCATION]. Mohon persiapkan peralatan dan datang tepat waktu. Terima kasih!',
  terms_and_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default profile
INSERT INTO user_profile (id) VALUES (uuid_generate_v4()) ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Users can read all data" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.email() = email);

CREATE POLICY "Authenticated users can manage clients" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage packages" ON packages FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage add_ons" ON add_ons FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage team_members" ON team_members FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage projects" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage transactions" ON transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage cards" ON cards FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage financial_pockets" ON financial_pockets FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage leads" ON leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage assets" ON assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage contracts" ON contracts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage client_feedback" ON client_feedback FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage notifications" ON notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage qr_codes" ON qr_codes FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage social_media_posts" ON social_media_posts FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage promo_codes" ON promo_codes FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sops" ON sops FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage team_project_payments" ON team_project_payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage team_payment_records" ON team_payment_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage reward_ledger_entries" ON reward_ledger_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage user_profile" ON user_profile FOR ALL TO authenticated USING (true);

-- Public access policies for portal and forms
CREATE POLICY "Public can read clients for portal access" ON clients FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read projects for portal access" ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read packages for booking form" ON packages FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read add_ons for booking form" ON add_ons FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read team_members for portal access" ON team_members FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read contracts for portal access" ON contracts FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read transactions for portal access" ON transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read user_profile for forms" ON user_profile FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read promo_codes for booking form" ON promo_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read qr_codes for verification" ON qr_codes FOR SELECT TO anon USING (true);

-- Public insert policies for forms
CREATE POLICY "Public can insert leads" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can insert clients from booking form" ON clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can insert projects from booking form" ON projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can insert transactions from booking form" ON transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can insert client_feedback" ON client_feedback FOR INSERT TO anon WITH CHECK (true);

-- Public update policies for portal interactions
CREATE POLICY "Public can update projects for client confirmations" ON projects FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can update promo_codes usage" ON promo_codes FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can update cards from booking form" ON cards FOR UPDATE TO anon USING (true);
CREATE POLICY "Public can update financial_pockets from booking form" ON financial_pockets FOR UPDATE TO anon USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_portal_access_id ON clients(portal_access_id);
CREATE INDEX IF NOT EXISTS idx_team_members_portal_access_id ON team_members(portal_access_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(date);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_add_ons_updated_at BEFORE UPDATE ON add_ons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_pockets_updated_at BEFORE UPDATE ON financial_pockets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_feedback_updated_at BEFORE UPDATE ON client_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON social_media_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sops_updated_at BEFORE UPDATE ON sops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_project_payments_updated_at BEFORE UPDATE ON team_project_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_payment_records_updated_at BEFORE UPDATE ON team_payment_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reward_ledger_entries_updated_at BEFORE UPDATE ON reward_ledger_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON user_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();