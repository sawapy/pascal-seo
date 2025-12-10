import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE flow with strict URL matching
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

// Database types
export interface Keyword {
  id: string;
  term: string;
  search_volume?: number;
  created_at: string;
  updated_at: string;
}

export interface DailyRanking {
  id: string;
  keyword_id: string;
  date: string;
  rank: number;
  created_at: string;
}

// Database operations
export const keywordService = {
  async getAll() {
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .order('term');
    
    if (error) throw error;
    return data as Keyword[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('keywords')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Keyword;
  },

  async create(keyword: Omit<Keyword, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('keywords')
      .insert(keyword)
      .select()
      .single();
    
    if (error) throw error;
    return data as Keyword;
  },

  async upsert(keyword: { term: string; search_volume?: number }) {
    const { data, error } = await supabase
      .from('keywords')
      .upsert(keyword, { onConflict: 'term' })
      .select()
      .single();
    
    if (error) throw error;
    return data as Keyword;
  }
};

export const rankingService = {
  async getRankingsByKeyword(keywordId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('daily_rankings')
      .select('*')
      .eq('keyword_id', keywordId)
      .order('date');

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as DailyRanking[];
  },

  async upsertRanking(ranking: Omit<DailyRanking, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('daily_rankings')
      .upsert(ranking, { onConflict: 'keyword_id,date' })
      .select()
      .single();
    
    if (error) throw error;
    return data as DailyRanking;
  },

  async bulkUpsertRankings(rankings: Omit<DailyRanking, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('daily_rankings')
      .upsert(rankings, { onConflict: 'keyword_id,date' })
      .select();
    
    if (error) throw error;
    return data as DailyRanking[];
  }
};