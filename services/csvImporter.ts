import { keywordService, rankingService } from './supabase';

export interface CsvRow {
  keyword: string;
  date: string;
  rank: number;
  searchVolume?: number;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedKeywords: number;
  importedRankings: number;
  errors: string[];
}

// Parse CSV content into structured data
export function parseCsv(csvContent: string): CsvRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Find column indices
  const keywordIndex = headers.findIndex(h => 
    h.includes('keyword') || h.includes('キーワード') || h.includes('term')
  );
  const dateIndex = headers.findIndex(h => 
    h.includes('date') || h.includes('日付') || h.includes('day')
  );
  const rankIndex = headers.findIndex(h => 
    h.includes('rank') || h.includes('順位') || h.includes('position')
  );
  const volumeIndex = headers.findIndex(h => 
    h.includes('volume') || h.includes('検索ボリューム') || h.includes('search')
  );

  if (keywordIndex === -1 || dateIndex === -1 || rankIndex === -1) {
    throw new Error('CSV must contain keyword, date, and rank columns');
  }

  const rows: CsvRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < 3) continue; // Skip incomplete rows
    
    const keyword = values[keywordIndex];
    const dateStr = values[dateIndex];
    const rankStr = values[rankIndex];
    
    if (!keyword || !dateStr || !rankStr) continue;
    
    // Parse date (support YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY formats)
    let date: string;
    try {
      const parsedDate = parseDate(dateStr);
      date = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (error) {
      throw new Error(`Invalid date format in row ${i + 1}: ${dateStr}`);
    }
    
    // Parse rank
    const rank = parseInt(rankStr);
    if (isNaN(rank) || rank < 1) {
      throw new Error(`Invalid rank in row ${i + 1}: ${rankStr}`);
    }
    
    // Parse search volume (optional)
    let searchVolume: number | undefined;
    if (volumeIndex !== -1 && values[volumeIndex]) {
      const volume = parseInt(values[volumeIndex]);
      if (!isNaN(volume)) {
        searchVolume = volume;
      }
    }
    
    rows.push({
      keyword,
      date,
      rank,
      searchVolume
    });
  }
  
  return rows;
}

// Parse various date formats
function parseDate(dateStr: string): Date {
  // Try different date formats
  const formats = [
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ];
  
  for (let i = 0; i < formats.length; i++) {
    const match = dateStr.match(formats[i]);
    if (match) {
      let year: number, month: number, day: number;
      
      if (i === 0) { // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else if (i === 1 || i === 3) { // DD/MM/YYYY or DD-MM-YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      } else { // MM/DD/YYYY
        month = parseInt(match[1]);
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
        return date;
      }
    }
  }
  
  throw new Error(`Unable to parse date: ${dateStr}`);
}

// Import CSV data to Supabase
export async function importCsvData(csvRows: CsvRow[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    totalRows: csvRows.length,
    importedKeywords: 0,
    importedRankings: 0,
    errors: []
  };
  
  try {
    // Group data by keyword for batch processing
    const keywordMap = new Map<string, { searchVolume?: number; rankings: Array<{ date: string; rank: number }> }>();
    
    csvRows.forEach(row => {
      if (!keywordMap.has(row.keyword)) {
        keywordMap.set(row.keyword, { 
          searchVolume: row.searchVolume,
          rankings: [] 
        });
      }
      
      const keywordData = keywordMap.get(row.keyword)!;
      keywordData.rankings.push({ date: row.date, rank: row.rank });
      
      // Update search volume if provided and not already set
      if (row.searchVolume && !keywordData.searchVolume) {
        keywordData.searchVolume = row.searchVolume;
      }
    });
    
    // Import keywords first
    const keywordIds = new Map<string, string>();
    
    for (const [term, data] of keywordMap) {
      try {
        const keyword = await keywordService.upsert({
          term,
          search_volume: data.searchVolume
        });
        keywordIds.set(term, keyword.id);
        result.importedKeywords++;
      } catch (error) {
        result.errors.push(`Failed to import keyword "${term}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Import rankings in batches
    const batchSize = 100;
    const rankingData: Array<{ keyword_id: string; date: string; rank: number }> = [];
    
    for (const [term, data] of keywordMap) {
      const keywordId = keywordIds.get(term);
      if (keywordId) {
        data.rankings.forEach(ranking => {
          rankingData.push({
            keyword_id: keywordId,
            date: ranking.date,
            rank: ranking.rank
          });
        });
      }
    }
    
    // Process rankings in batches
    for (let i = 0; i < rankingData.length; i += batchSize) {
      const batch = rankingData.slice(i, i + batchSize);
      try {
        await rankingService.bulkUpsertRankings(batch);
        result.importedRankings += batch.length;
      } catch (error) {
        result.errors.push(`Failed to import ranking batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    result.success = result.errors.length === 0;
    return result;
    
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

// Validate CSV format before import
export function validateCsvFormat(csvContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least a header row and one data row');
      return { isValid: false, errors };
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const hasKeyword = headers.some(h => 
      h.includes('keyword') || h.includes('キーワード') || h.includes('term')
    );
    const hasDate = headers.some(h => 
      h.includes('date') || h.includes('日付') || h.includes('day')
    );
    const hasRank = headers.some(h => 
      h.includes('rank') || h.includes('順位') || h.includes('position')
    );
    
    if (!hasKeyword) {
      errors.push('CSV must contain a keyword column (keyword, キーワード, or term)');
    }
    if (!hasDate) {
      errors.push('CSV must contain a date column (date, 日付, or day)');
    }
    if (!hasRank) {
      errors.push('CSV must contain a rank column (rank, 順位, or position)');
    }
    
    // Check sample rows for format issues
    const sampleRows = lines.slice(1, Math.min(6, lines.length));
    for (let i = 0; i < sampleRows.length; i++) {
      const values = sampleRows[i].split(',');
      if (values.length < 3) {
        errors.push(`Row ${i + 2} has insufficient columns`);
      }
    }
    
  } catch (error) {
    errors.push('Failed to parse CSV content');
  }
  
  return { 
    isValid: errors.length === 0, 
    errors 
  };
}