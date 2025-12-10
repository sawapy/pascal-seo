import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  try {
    // Get the keyword(s)
    const { data: keywords, error: keywordError } = await supabase
      .from('pascal_keywords')
      .select('*')
      .eq('keyword_text', '太陽光発電');
    
    if (keywordError) {
      console.error('Error fetching keyword:', keywordError);
      return;
    }
    
    console.log('Keywords found:', keywords.length);
    keywords.forEach(k => {
      console.log(`- ID: ${k.id}, Pascal ID: ${k.pascal_id}, Text: ${k.keyword_text}`);
    });
    
    // Check rankings for each keyword
    for (const keyword of keywords) {
      console.log(`\n=== Checking keyword ID: ${keyword.id} (Pascal ID: ${keyword.pascal_id}) ===`);
      
      // Get all rankings for this keyword
      const { data: rankings, error: rankingsError } = await supabase
        .from('pascal_daily_rankings')
        .select('date, rank')
        .eq('pascal_keyword_id', keyword.id)
        .order('date');
    
      if (rankingsError) {
        console.error('Error fetching rankings:', rankingsError);
        continue;
      }
      
      console.log('Total records:', rankings.length);
      
      if (rankings.length > 0) {
        const dates = rankings.map(r => r.date);
        console.log('Date range:', dates[0], 'to', dates[dates.length - 1]);
        
        // Group by year-month
        const monthlyData = {};
        rankings.forEach(r => {
          const yearMonth = r.date.substring(0, 7);
          monthlyData[yearMonth] = (monthlyData[yearMonth] || 0) + 1;
        });
        
        console.log('Monthly Distribution:');
        Object.keys(monthlyData).sort().forEach(month => {
          console.log(`  ${month}: ${monthlyData[month]} records`);
        });
        
        // Check specific months
        const june2024 = rankings.filter(r => r.date.startsWith('2024-06'));
        console.log(`2024-06 (June): ${june2024.length} records`);
        if (june2024.length > 0) {
          console.log('Sample June dates:', june2024.slice(0, 5).map(r => r.date));
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();