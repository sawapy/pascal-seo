export interface PascalKeywordData {
  pascal_id: number;
  keyword_text: string;
  monthly_search_volume?: number;
  domain_url?: string;
  site_name?: string;
  rank_type?: string;
  area?: string;
  device_type?: string;
  landing_page?: string;
}

export interface PascalRankingData {
  pascal_id: number;
  date: string;
  rank?: number; // undefined means 圏外
}

export interface PascalCsvData {
  keywords: PascalKeywordData[];
  rankings: PascalRankingData[];
}

// Parse Pascal CSV format
export function parsePascalCsv(csvContent: string): PascalCsvData {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must contain at least header and one data row');
  }

  const header = lines[0];
  
  // Parse header to find date columns (日付カラムを探す)
  const headers = header.split(',').map(h => h.trim());
  
  // Find standard columns
  const columnMap: { [key: string]: number } = {};
  headers.forEach((h, index) => {
    const lowerHeader = h.toLowerCase();
    if (h.includes('Pascal ID') || h.includes('pascal id')) {
      columnMap.pascal_id = index;
    } else if (h.includes('キーワード') || lowerHeader.includes('keyword')) {
      columnMap.keyword = index;
    } else if (h.includes('月間検索数') || lowerHeader.includes('search volume')) {
      columnMap.search_volume = index;
    } else if (h.includes('ドメイン') || lowerHeader.includes('domain')) {
      columnMap.domain_url = index;
    } else if (h.includes('サイト名') || lowerHeader.includes('site')) {
      columnMap.site_name = index;
    } else if (h.includes('順位取得') || lowerHeader.includes('rank type')) {
      columnMap.rank_type = index;
    } else if (h.includes('エリア') || lowerHeader.includes('area')) {
      columnMap.area = index;
    } else if (h.includes('種別') || lowerHeader.includes('device')) {
      columnMap.device_type = index;
    } else if (h.includes('ランディング') || lowerHeader.includes('landing')) {
      columnMap.landing_page = index;
    }
  });

  // Find date columns (J列以降 = index 9以降)
  const dateColumns: Array<{ index: number; date: string }> = [];
  
  console.log('CSV Headers:', headers);
  
  headers.forEach((header, index) => {
    // 日付パターンを検出: "YYYY年M月D日" または "YYYY/M/D" など
    const datePatterns = [
      /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];
    
    for (const pattern of datePatterns) {
      const match = header.match(pattern);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        // Use UTC to avoid timezone offset issues
        const date = new Date(Date.UTC(year, month - 1, day));
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dateColumns.push({ index, date: dateString });
        console.log(`Found date column: "${header}" -> ${dateString} (index ${index})`);
        break;
      }
    }
  });
  
  console.log('Total date columns found:', dateColumns.length);
  if (dateColumns.length > 0) {
    const dates = dateColumns.map(dc => dc.date).sort();
    console.log('Date range in CSV:', dates[0], 'to', dates[dates.length - 1]);
    
    // Check for 2025 dates
    const dates2025 = dates.filter(d => d.startsWith('2025'));
    console.log('2025 dates in CSV:', dates2025.length, dates2025);
  }

  if (columnMap.pascal_id === undefined || columnMap.keyword === undefined) {
    throw new Error('CSV must contain Pascal ID and キーワード columns');
  }

  if (dateColumns.length === 0) {
    throw new Error('No date columns found in CSV');
  }

  const keywords: PascalKeywordData[] = [];
  const rankings: PascalRankingData[] = [];

  // Process each data row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < Math.max(...Object.values(columnMap)) + 1) {
      console.warn(`Row ${i + 1}: Insufficient columns, skipping`);
      continue;
    }

    const pascalId = parseInt(values[columnMap.pascal_id]);
    if (isNaN(pascalId)) {
      console.warn(`Row ${i + 1}: Invalid Pascal ID, skipping`);
      continue;
    }

    const keywordText = values[columnMap.keyword];
    if (!keywordText) {
      console.warn(`Row ${i + 1}: Empty keyword, skipping`);
      continue;
    }

    // Parse keyword data
    const keywordData: PascalKeywordData = {
      pascal_id: pascalId,
      keyword_text: keywordText
    };

    // Optional fields
    if (columnMap.search_volume !== undefined && values[columnMap.search_volume]) {
      const volume = values[columnMap.search_volume];
      if (volume !== '-' && volume !== '') {
        const volumeNum = parseInt(volume);
        if (!isNaN(volumeNum)) {
          keywordData.monthly_search_volume = volumeNum;
        }
      }
    }

    if (columnMap.domain_url !== undefined) {
      keywordData.domain_url = values[columnMap.domain_url] || undefined;
    }
    if (columnMap.site_name !== undefined) {
      keywordData.site_name = values[columnMap.site_name] || undefined;
    }
    if (columnMap.rank_type !== undefined) {
      keywordData.rank_type = values[columnMap.rank_type] || undefined;
    }
    if (columnMap.area !== undefined) {
      keywordData.area = values[columnMap.area] || undefined;
    }
    if (columnMap.device_type !== undefined) {
      keywordData.device_type = values[columnMap.device_type] || undefined;
    }
    if (columnMap.landing_page !== undefined) {
      keywordData.landing_page = values[columnMap.landing_page] || undefined;
    }

    keywords.push(keywordData);

    // Parse daily ranking data
    dateColumns.forEach(({ index, date }) => {
      const rankValue = values[index];
      
      if (rankValue && rankValue !== '' && rankValue !== '-') {
        const rank = parseInt(rankValue);
        if (!isNaN(rank) && rank > 0) {
          rankings.push({
            pascal_id: pascalId,
            date: date,
            rank: rank
          });
        }
      }
      // If empty or '-', we don't add a ranking record (圏外)
    });
  }

  return { keywords, rankings };
}

// Validate Pascal CSV format
export function validatePascalCsv(csvContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least header and one data row');
      return { isValid: false, errors };
    }

    const headers = lines[0].split(',').map(h => h.trim());

    // Check for required columns
    const hasPascalId = headers.some(h => h.includes('Pascal ID') || h.includes('pascal id'));
    const hasKeyword = headers.some(h => h.includes('キーワード') || h.toLowerCase().includes('keyword'));
    
    if (!hasPascalId) {
      errors.push('CSV must contain Pascal ID column');
    }
    if (!hasKeyword) {
      errors.push('CSV must contain キーワード column');
    }

    // Check for date columns
    const dateCount = headers.filter(h => {
      return /\d{4}年\d{1,2}月\d{1,2}日/.test(h) || 
             /\d{4}\/\d{1,2}\/\d{1,2}/.test(h) || 
             /\d{4}-\d{1,2}-\d{1,2}/.test(h);
    }).length;

    if (dateCount === 0) {
      errors.push('CSV must contain date columns (format: YYYY年M月D日)');
    }

    // Check sample data rows
    const sampleRows = lines.slice(1, Math.min(4, lines.length));
    for (let i = 0; i < sampleRows.length; i++) {
      const values = sampleRows[i].split(',');
      if (values.length < headers.length * 0.5) { // At least half the expected columns
        errors.push(`Row ${i + 2}: Insufficient data`);
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