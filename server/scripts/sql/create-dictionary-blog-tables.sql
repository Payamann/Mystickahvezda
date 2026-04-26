-- Vytvoření tabulky pro Ezoterický slovník
CREATE TABLE IF NOT EXISTS dictionary_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_description TEXT,
    content_html TEXT NOT NULL,
    category TEXT DEFAULT 'Obecné',
    related_features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vytvoření indexu pro rychlé vyhledávání podle slug
CREATE INDEX IF NOT EXISTS idx_dictionary_slug ON dictionary_terms(slug);
CREATE INDEX IF NOT EXISTS idx_dictionary_category ON dictionary_terms(category);

-- Vytvoření tabulky pro Blog
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_description TEXT,
    content_html TEXT NOT NULL,
    category TEXT DEFAULT 'Všeobecné',
    featured_image TEXT,
    author TEXT DEFAULT 'Mystická Hvězda',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vytvoření indexu pro vyhledávání blogů
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(is_published, published_at DESC);

-- RLS (Row Level Security) - Čtení pro všechny, zápis jen pro admin/role
-- Zde zapínáme RLS, ale pro veřejné weby (SSG) budeme číst přes service role klíč během buildu,
-- nebo můžeme povolit veřejné čtení, pokud chceme načítat i z klienta.
ALTER TABLE dictionary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Povolit veřejné čtení pojmů
CREATE POLICY "Povolené veřejné čtení pro dictionary_terms" 
ON dictionary_terms FOR SELECT 
USING (true);

-- Povolit veřejné čtení POUZE publikovaných blogpostů
CREATE POLICY "Povolené veřejné čtení pro publikované blog_posts" 
ON blog_posts FOR SELECT 
USING (is_published = true);
