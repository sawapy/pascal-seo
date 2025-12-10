import { supabase } from './supabase';
import { PascalKeywordData, PascalRankingData, PascalCsvData, parsePascalCsv, validatePascalCsv } from './pascalCsvParser';

// Database types for Pascal format
export interface PascalKeyword {
  id: string;
  pascal_id: number;
  keyword_text: string;
  monthly_search_volume?: number;
  domain_url?: string;
  site_name?: string;
  rank_type?: string;
  area?: string;
  device_type?: string;
  landing_page?: string;
  created_at: string;
  updated_at: string;
}

export interface PascalDailyRanking {
  id: string;
  pascal_keyword_id: string;
  date: string;
  rank?: number;
  created_at: string;
}

// Pascal keyword service
export const pascalKeywordService = {
  async getAll() {
    const { data, error } = await supabase
      .from('pascal_keywords')
      .select('*')
      .order('keyword_text');
    
    if (error) throw error;
    return data as PascalKeyword[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('pascal_keywords')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as PascalKeyword;
  },

  async getByPascalId(pascalId: number) {
    const { data, error } = await supabase
      .from('pascal_keywords')
      .select('*')
      .eq('pascal_id', pascalId)
      .single();
    
    if (error) return null;
    return data as PascalKeyword;
  },

  async upsert(keyword: PascalKeywordData) {
    const { data, error } = await supabase
      .from('pascal_keywords')
      .upsert({
        pascal_id: keyword.pascal_id,
        keyword_text: keyword.keyword_text,
        monthly_search_volume: keyword.monthly_search_volume,
        domain_url: keyword.domain_url,
        site_name: keyword.site_name,
        rank_type: keyword.rank_type,
        area: keyword.area,
        device_type: keyword.device_type,
        landing_page: keyword.landing_page
      }, { 
        onConflict: 'pascal_id',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as PascalKeyword;
  }
};

// Pascal ranking service
export const pascalRankingService = {
  async getRankingsByKeyword(keywordId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('pascal_daily_rankings')
      .select('*')
      .eq('pascal_keyword_id', keywordId)
      .order('date');

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as PascalDailyRanking[];
  },

  async upsertRanking(keywordId: string, ranking: PascalRankingData) {
    const { data, error } = await supabase
      .from('pascal_daily_rankings')
      .upsert({
        pascal_keyword_id: keywordId,
        date: ranking.date,
        rank: ranking.rank
      }, { onConflict: 'pascal_keyword_id,date' })
      .select()
      .single();
    
    if (error) throw error;
    return data as PascalDailyRanking;
  },

  async bulkUpsertRankings(rankings: Array<{ pascal_keyword_id: string; date: string; rank?: number }>) {
    const { data, error } = await supabase
      .from('pascal_daily_rankings')
      .upsert(rankings, { onConflict: 'pascal_keyword_id,date' })
      .select();
    
    if (error) throw error;
    return data as PascalDailyRanking[];
  }
};

// Pascal CSV import service
export interface PascalImportResult {
  success: boolean;
  totalKeywords: number;
  importedKeywords: number;
  updatedKeywords: number;
  totalRankings: number;
  importedRankings: number;
  errors: string[];
  summary: string;
}

// Progress callback type
export type ProgressCallback = (current: number, total: number, message: string) => void;

export async function importPascalCsv(
  csvContent: string, 
  progressCallback?: ProgressCallback
): Promise<PascalImportResult> {
  const result: PascalImportResult = {
    success: false,
    totalKeywords: 0,
    importedKeywords: 0,
    updatedKeywords: 0,
    totalRankings: 0,
    importedRankings: 0,
    errors: [],
    summary: ''
  };

  try {
    progressCallback?.(1, 10, 'CSV形式を検証中...');
    
    // Validate CSV format
    const validation = validatePascalCsv(csvContent);
    if (!validation.isValid) {
      result.errors = validation.errors;
      return result;
    }

    progressCallback?.(2, 10, 'CSVデータを解析中...');

    // Parse CSV data
    const csvData = parsePascalCsv(csvContent);
    result.totalKeywords = csvData.keywords.length;
    result.totalRankings = csvData.rankings.length;

    if (csvData.keywords.length === 0) {
      result.errors.push('No valid keywords found in CSV');
      return result;
    }

    progressCallback?.(3, 10, `${result.totalKeywords}件のキーワードを登録中...`);

    // Import keywords first (optimized with chunking)
    const keywordIdMap = new Map<number, string>(); // pascal_id -> uuid
    const KEYWORD_BATCH_SIZE = 50; // Process keywords in smaller batches

    for (let i = 0; i < csvData.keywords.length; i += KEYWORD_BATCH_SIZE) {
      const batch = csvData.keywords.slice(i, i + KEYWORD_BATCH_SIZE);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (keywordData) => {
        try {
          console.log(`Processing keyword: Pascal ID ${keywordData.pascal_id}, Text: "${keywordData.keyword_text}"`);
          const keyword = await pascalKeywordService.upsert(keywordData);
          keywordIdMap.set(keywordData.pascal_id, keyword.id);
          console.log(`✓ Keyword upserted: ${keywordData.pascal_id} -> ${keyword.id}`);
          result.importedKeywords++;
        } catch (error) {
          const errorMsg = `Failed to import keyword Pascal ID ${keywordData.pascal_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      });

      await Promise.all(batchPromises);
      
      // Update progress
      const keywordProgress = Math.min(7, 3 + Math.floor((i / csvData.keywords.length) * 4));
      progressCallback?.(keywordProgress, 10, `キーワード ${Math.min(i + KEYWORD_BATCH_SIZE, csvData.keywords.length)}/${csvData.keywords.length} 登録完了`);
    }

    progressCallback?.(7, 10, `${result.totalRankings}件の順位データを処理中...`);

    // Group rankings by keyword for batch processing
    const rankingsByKeyword = new Map<number, PascalRankingData[]>();
    csvData.rankings.forEach(ranking => {
      if (!rankingsByKeyword.has(ranking.pascal_id)) {
        rankingsByKeyword.set(ranking.pascal_id, []);
      }
      rankingsByKeyword.get(ranking.pascal_id)!.push(ranking);
    });

    const RANKING_BATCH_SIZE = 100; // Smaller batch size for rankings
    let processedKeywords = 0;
    const totalKeywordsWithRankings = rankingsByKeyword.size;

    // Import rankings in batches per keyword
    for (const [pascalId, rankings] of rankingsByKeyword) {
      const keywordId = keywordIdMap.get(pascalId);
      if (!keywordId) {
        result.errors.push(`Keyword not found for Pascal ID ${pascalId}, skipping rankings`);
        continue;
      }

      console.log(`Processing rankings for Pascal ID ${pascalId} (${keywordId}): ${rankings.length} records`);
      const sampleDates = rankings.slice(0, 5).map(r => r.date);
      console.log(`Sample dates for Pascal ID ${pascalId}:`, sampleDates);

      try {
        // Process rankings in smaller batches to avoid timeouts
        for (let i = 0; i < rankings.length; i += RANKING_BATCH_SIZE) {
          const batch = rankings.slice(i, i + RANKING_BATCH_SIZE);
          const rankingData = batch.map(r => ({
            pascal_keyword_id: keywordId,
            date: r.date,
            rank: r.rank
          }));

          console.log(`Upserting batch ${Math.floor(i/RANKING_BATCH_SIZE) + 1} for Pascal ID ${pascalId}: ${rankingData.length} records`);
          await pascalRankingService.bulkUpsertRankings(rankingData);
          result.importedRankings += rankingData.length;
        }
        
        processedKeywords++;
        // Update progress for rankings
        const rankingProgress = 8 + Math.floor((processedKeywords / totalKeywordsWithRankings) * 2);
        progressCallback?.(rankingProgress, 10, `順位データ ${processedKeywords}/${totalKeywordsWithRankings} キーワード完了`);
        
      } catch (error) {
        const errorMsg = `Failed to import rankings for Pascal ID ${pascalId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    progressCallback?.(10, 10, 'インポート完了');
    
    result.success = result.errors.length === 0;
    result.summary = `Keywords: ${result.importedKeywords}/${result.totalKeywords}, Rankings: ${result.importedRankings}/${result.totalRankings}`;
    
    return result;

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

// Get keywords in format expected by existing components with current rank
export async function getPascalKeywordsForDisplay() {
  const keywords = await pascalKeywordService.getAll();
  
  // Get latest rankings for all keywords using a more efficient approach
  const keywordIds = keywords.map(k => k.id);
  
  // Get the latest ranking for each keyword with a single query per keyword
  const latestRankMap = new Map<string, number>();
  
  for (const keywordId of keywordIds) {
    const { data: latestRanking, error } = await supabase
      .from('pascal_daily_rankings')
      .select('rank, date')
      .eq('pascal_keyword_id', keywordId)
      .order('date', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching latest ranking for keyword ${keywordId}:`, error);
    }
    
    if (latestRanking) {
      latestRankMap.set(keywordId, latestRanking.rank);
      console.log(`Keyword ${keywordId}: latest rank ${latestRanking.rank} on ${latestRanking.date}`);
    } else {
      console.log(`Keyword ${keywordId}: no ranking data found`);
    }
  }
  
  console.log('Latest rank map size:', latestRankMap.size);

  return keywords.map(k => ({
    id: k.id,
    pascal_id: k.pascal_id,
    term: k.keyword_text,
    volume: k.monthly_search_volume,
    currentRank: latestRankMap.get(k.id), // Latest rank from database
    siteName: k.site_name,
    rankType: k.rank_type,
    deviceType: k.device_type,
    area: k.area
  }));
}

// Get latest ranking date from database
export async function getLatestRankingDate(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('pascal_daily_rankings')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error getting latest date:', error);
      return null;
    }
    
    return data?.date || null;
  } catch (error) {
    console.error('Error getting latest date:', error);
    return null;
  }
}

// Get keyword details for selected keyword
export async function getPascalKeywordDetails(keywordId: string) {
  const keyword = await pascalKeywordService.getById(keywordId);
  return {
    monthly_search_volume: keyword.monthly_search_volume,
    domain_url: keyword.domain_url,
    site_name: keyword.site_name,
    rank_type: keyword.rank_type,
    area: keyword.area,
    device_type: keyword.device_type,
    landing_page: keyword.landing_page
  };
}

// Debug function to check date ranges in database
export async function debugRankingDateRanges(keywordId: string) {
  const { data, error } = await supabase
    .from('pascal_daily_rankings')
    .select('date, rank')
    .eq('pascal_keyword_id', keywordId)
    .order('date');
    
  if (error) throw error;
  
  if (data && data.length > 0) {
    const dates = data.map(r => r.date);
    console.log('=== DATABASE DEBUG for keyword:', keywordId, '===');
    console.log('Total records in DB:', data.length);
    console.log('First date:', dates[0]);
    console.log('Last date:', dates[dates.length - 1]);
    
    // Check for gaps in the data
    const allDates = dates.sort();
    const gaps: string[] = [];
    
    for (let i = 1; i < allDates.length; i++) {
      const prevDate = new Date(allDates[i-1]);
      const currDate = new Date(allDates[i]);
      const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 1) {
        gaps.push(`Gap: ${allDates[i-1]} to ${allDates[i]} (${daysDiff} days)`);
      }
    }
    
    console.log('Data gaps found:', gaps.length);
    gaps.forEach(gap => console.log(gap));
    
    // Check specific periods
    const year2024 = dates.filter(d => d.startsWith('2024'));
    const year2025 = dates.filter(d => d.startsWith('2025'));
    
    console.log('2024 dates count:', year2024.length);
    if (year2024.length > 0) {
      console.log('2024 range:', year2024[0], 'to', year2024[year2024.length - 1]);
    }
    
    console.log('2025 dates count:', year2025.length);
    if (year2025.length > 0) {
      console.log('2025 range:', year2025[0], 'to', year2025[year2025.length - 1]);
    }
    
    // Check problematic periods specifically
    const dec2024 = dates.filter(d => d >= '2024-12-01' && d <= '2024-12-31');
    const janToMar2025 = dates.filter(d => d >= '2025-01-01' && d <= '2025-03-31');
    const aprToJul2025 = dates.filter(d => d >= '2025-04-01' && d <= '2025-07-31');
    
    console.log('December 2024:', dec2024.length, 'records');
    console.log('Jan-Mar 2025:', janToMar2025.length, 'records');
    console.log('Apr-Jul 2025:', aprToJul2025.length, 'records');
    
    console.log('=== END DATABASE DEBUG ===');
  } else {
    console.log('No data found in database for keyword:', keywordId);
  }
  
  return data;
}

// Get ranking data in format expected by existing components
export async function getPascalRankingData(keywordId: string, startDate?: string, endDate?: string) {
  // Add debug logging
  console.log('Fetching rankings for:', { keywordId, startDate, endDate });
  
  const rankings = await pascalRankingService.getRankingsByKeyword(keywordId, startDate, endDate);
  
  console.log('Raw rankings count:', rankings.length);
  if (rankings.length > 0) {
    console.log('Date range in results:', rankings[0].date, 'to', rankings[rankings.length - 1].date);
  }
  
  const filtered = rankings
    .filter(r => r.rank !== null && r.rank !== undefined)
    .map(r => ({
      date: r.date,
      rank: r.rank!
    }));
    
  console.log('Filtered rankings count:', filtered.length);
  
  return filtered;
}