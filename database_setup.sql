-- SEO Trend Analyzer Database Schema (Pascal Format)
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pascal keywords table (stores all keyword metadata)
CREATE TABLE IF NOT EXISTS pascal_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pascal_id INTEGER UNIQUE NOT NULL,
    keyword_text VARCHAR NOT NULL,
    monthly_search_volume INTEGER, -- 月間検索数（月平均）
    domain_url TEXT,
    site_name VARCHAR,
    rank_type VARCHAR, -- 順位取得 (ドメイン一致/完全一致など)
    area VARCHAR, -- エリア
    device_type VARCHAR, -- 種別 (PC/SP)
    landing_page TEXT, -- ランディングページ（最新日付）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily rankings table (stores daily ranking data)
CREATE TABLE IF NOT EXISTS pascal_daily_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pascal_keyword_id UUID REFERENCES pascal_keywords(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    rank INTEGER, -- NULLの場合は圏外
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(pascal_keyword_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pascal_daily_rankings_keyword_date ON pascal_daily_rankings(pascal_keyword_id, date);
CREATE INDEX IF NOT EXISTS idx_pascal_daily_rankings_date ON pascal_daily_rankings(date);
CREATE INDEX IF NOT EXISTS idx_pascal_keywords_pascal_id ON pascal_keywords(pascal_id);
CREATE INDEX IF NOT EXISTS idx_pascal_keywords_keyword_text ON pascal_keywords(keyword_text);

-- Row Level Security (RLS) policies
ALTER TABLE pascal_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE pascal_daily_rankings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (can be refined later)
CREATE POLICY "Allow all for authenticated users" ON pascal_keywords
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON pascal_daily_rankings
    FOR ALL USING (true);

-- Update trigger for keywords updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pascal_keywords_updated_at BEFORE UPDATE
    ON pascal_keywords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();