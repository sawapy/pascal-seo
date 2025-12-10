
import { Keyword, RankingData } from '../types';

/**
 * NOTE: In a real application, this file would import the supabase client.
 * 
 * import { createClient } from '@supabase/supabase-js';
 * const supabase = createClient('SUPABASE_URL', 'SUPABASE_KEY');
 */

// Mock Data Generator
const generateMockHistory = (keywordId: string, days: number): RankingData[] => {
  const data: RankingData[] = [];
  const today = new Date();
  
  // Create a pseudo-random but consistent trend based on keyword ID char code
  // Use a hash of the string to ensure stability for string IDs
  let hash = 0;
  for (let i = 0; i < keywordId.length; i++) {
    hash = ((hash << 5) - hash) + keywordId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  let baseRank = (Math.abs(hash) % 20) + 1; 

  for (let i = days; i >= 0; i -= 7) { // Weekly data points
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some noise
    const fluctuation = Math.floor(Math.random() * 5) - 2;
    let rank = baseRank + fluctuation;
    rank = Math.max(1, Math.min(100, rank)); // Clamp between 1 and 100
    
    // Simulate a trend change for variety
    if (i < days / 2) {
        baseRank -= 1; // Improving trend
    }

    data.push({
      date: date.toISOString().split('T')[0],
      rank: Math.max(1, Math.round(rank)),
    });
  }
  return data;
};

// Mutable storage for prototype session
let mockKeywordsData: Keyword[] = [
  { id: '1', term: '太陽光発電 投資', volume: 5400, currentRank: 3 },
  { id: '2', term: 'ソーラーパネル 価格', volume: 2200, currentRank: 8 },
  { id: '3', term: '自家消費型太陽光', volume: 1800, currentRank: 12 },
  { id: '4', term: '産業用太陽光 メリット', volume: 880, currentRank: 5 },
  { id: '5', term: '脱炭素経営', volume: 12000, currentRank: 15 },
  { id: '6', term: 'コーポレートPPA', volume: 320, currentRank: 2 },
  { id: '7', term: '蓄電池 補助金 2024', volume: 4500, currentRank: 1 },
];

export const getKeywords = async (): Promise<Keyword[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  /* 
   * Real Supabase Implementation:
   * const { data, error } = await supabase.from('keywords').select('*');
   * if (error) throw error;
   * return data;
   */
  
  return [...mockKeywordsData]; // Return copy
};

export const addKeywordsFromCsv = async (csvContent: string): Promise<number> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const lines = csvContent.split(/\r\n|\n/);
  let count = 0;
  const newKeywords: Keyword[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    
    // Skip header if it likely contains "keyword" or "term"
    if (index === 0 && (line.toLowerCase().includes('keyword') || line.includes('キーワード') || line.includes('term'))) return;

    const parts = line.split(',');
    const term = parts[0]?.trim();
    
    if (term) {
      // Basic validation to avoid duplicates by term
      if (!mockKeywordsData.some(k => k.term === term) && !newKeywords.some(k => k.term === term)) {
        const volumeStr = parts[1]?.trim();
        const volume = volumeStr ? parseInt(volumeStr.replace(/[^0-9]/g, '')) : undefined;
        
        // Random rank for demo purposes upon import
        const demoRank = Math.floor(Math.random() * 50) + 1;

        newKeywords.push({
          id: `csv-${Date.now()}-${index}`,
          term: term,
          volume: volume || Math.floor(Math.random() * 1000) + 100, // Random volume if missing
          currentRank: demoRank
        });
        count++;
      }
    }
  });

  if (count > 0) {
    mockKeywordsData = [...mockKeywordsData, ...newKeywords];
  }

  return count;
};

export const getRankingHistory = async (keywordId: string, startDate: string, endDate: string): Promise<RankingData[]> => {
  await new Promise(resolve => setTimeout(resolve, 600));

  /* 
   * Real Supabase Implementation:
   * const { data, error } = await supabase
   *   .from('rankings')
   *   .select('date, rank')
   *   .eq('keyword_id', keywordId)
   *   .gte('date', startDate)
   *   .lte('date', endDate)
   *   .order('date', { ascending: true });
   * if (error) throw error;
   * return data;
   */

  // Determine days difference for mock generation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return generateMockHistory(keywordId, diffDays);
};
