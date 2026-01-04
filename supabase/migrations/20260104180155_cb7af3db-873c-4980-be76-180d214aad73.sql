-- Enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('proprietaire', 'employe');

-- Enum pour les tailles de vêtements
CREATE TYPE public.taille_vetement AS ENUM ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL');

-- Enum pour les modes de paiement
CREATE TYPE public.mode_paiement AS ENUM ('especes', 'mobile_money', 'carte', 'credit');

-- Table des profils utilisateurs
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nom_complet TEXT NOT NULL,
  pin_code TEXT,
  telephone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des rôles utilisateurs (sécurité)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Table des catégories de produits
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des produits
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_modele TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  categorie_id UUID REFERENCES public.categories(id),
  prix_unitaire BIGINT NOT NULL DEFAULT 0,
  image_url TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table du stock par produit et taille
CREATE TABLE public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  taille taille_vetement NOT NULL,
  quantite_initiale INTEGER NOT NULL DEFAULT 0,
  quantite_actuelle INTEGER NOT NULL DEFAULT 0,
  seuil_alerte INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (product_id, taille)
);

-- Table des plans de travail journaliers
CREATE TABLE public.daily_work_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_travail DATE NOT NULL UNIQUE,
  employe_id UUID REFERENCES auth.users(id),
  notes TEXT,
  cloture BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des lignes du plan de travail
CREATE TABLE public.work_plan_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_plan_id UUID REFERENCES public.daily_work_plans(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  taille taille_vetement NOT NULL,
  quantite_initiale INTEGER NOT NULL DEFAULT 0,
  quantite_vendue INTEGER NOT NULL DEFAULT 0,
  quantite_restante INTEGER GENERATED ALWAYS AS (quantite_initiale - quantite_vendue) STORED,
  prix_unitaire BIGINT NOT NULL DEFAULT 0,
  prix_total BIGINT GENERATED ALWAYS AS (quantite_vendue * prix_unitaire) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des ventes
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_plan_id UUID REFERENCES public.daily_work_plans(id),
  employe_id UUID REFERENCES auth.users(id),
  date_vente TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  montant_total BIGINT NOT NULL DEFAULT 0,
  mode_paiement mode_paiement NOT NULL DEFAULT 'especes',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des lignes de vente
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  taille taille_vetement NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire BIGINT NOT NULL DEFAULT 0,
  prix_total BIGINT GENERATED ALWAYS AS (quantite * prix_unitaire) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_plan_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier le rôle
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fonction pour vérifier si l'utilisateur est authentifié
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS Policies pour profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Proprietaire can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- RLS Policies pour user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Proprietaire can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- RLS Policies pour categories (tous les utilisateurs authentifiés peuvent lire)
CREATE POLICY "Authenticated users can read categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Proprietaire can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

CREATE POLICY "Employes can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

-- RLS Policies pour products
CREATE POLICY "Authenticated users can read products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Proprietaire can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

CREATE POLICY "Employes can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

-- RLS Policies pour stock
CREATE POLICY "Authenticated users can read stock"
ON public.stock FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Proprietaire can manage stock"
ON public.stock FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

CREATE POLICY "Employes can manage stock"
ON public.stock FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

-- RLS Policies pour daily_work_plans
CREATE POLICY "Authenticated users can read work plans"
ON public.daily_work_plans FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employes can manage work plans"
ON public.daily_work_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

CREATE POLICY "Proprietaire can view work plans"
ON public.daily_work_plans FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- RLS Policies pour work_plan_lines
CREATE POLICY "Authenticated users can read work plan lines"
ON public.work_plan_lines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employes can manage work plan lines"
ON public.work_plan_lines FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

CREATE POLICY "Proprietaire can view work plan lines"
ON public.work_plan_lines FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- RLS Policies pour sales
CREATE POLICY "Authenticated users can read sales"
ON public.sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employes can manage sales"
ON public.sales FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

CREATE POLICY "Proprietaire can view sales"
ON public.sales FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- RLS Policies pour sale_items
CREATE POLICY "Authenticated users can read sale items"
ON public.sale_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Employes can manage sale items"
ON public.sale_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employe'));

CREATE POLICY "Proprietaire can view sale items"
ON public.sale_items FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'proprietaire'));

-- Trigger pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nom_complet)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nom_complet', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_updated_at
  BEFORE UPDATE ON public.stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_work_plans_updated_at
  BEFORE UPDATE ON public.daily_work_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_plan_lines_updated_at
  BEFORE UPDATE ON public.work_plan_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer quelques catégories par défaut
INSERT INTO public.categories (nom, description) VALUES
  ('Chemises', 'Chemises et chemisettes'),
  ('Pantalons', 'Pantalons et jeans'),
  ('Robes', 'Robes et jupes'),
  ('T-shirts', 'T-shirts et polos'),
  ('Vestes', 'Vestes et manteaux'),
  ('Accessoires', 'Ceintures, chapeaux, etc.');

-- Activer realtime pour les tables principales
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_work_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_plan_lines;