import fs from 'fs';
import iconv from 'iconv-lite';

const csvFiles = [
  '/Users/oosawashunsuke/Downloads/ranking_20251128175757_202405 (1).csv', // May
  '/Users/oosawashunsuke/Downloads/ranking_20251128175830_202406.csv',       // June  
  '/Users/oosawashunsuke/Downloads/ranking_20251128175924_202407.csv',       // July
  '/Users/oosawashunsuke/Downloads/ranking_20251128175953_202408.csv'        // August
];

csvFiles.forEach((csvPath, index) => {
  const monthNames = ['May', 'June', 'July', 'August'];
  console.log(`\n=== ${monthNames[index]} CSV Analysis ===`);
  
  try {
    const buffer = fs.readFileSync(csvPath);
    const content = iconv.decode(buffer, 'Shift_JIS');
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    console.log('Total columns:', headers.length);
    console.log('Total rows:', lines.length);
    
    // Find date columns
    const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
    const dateColumns = [];
    
    headers.forEach((header, index) => {
      if (datePattern.test(header)) {
        const match = header.match(datePattern);
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        const dateString = date.toISOString().split('T')[0];
        dateColumns.push({ index, date: dateString });
      }
    });
    
    console.log('Date columns found:', dateColumns.length);
    if (dateColumns.length > 0) {
      const dates = dateColumns.map(dc => dc.date).sort();
      console.log('Date range:', dates[0], 'to', dates[dates.length - 1]);
    }
    
    // Find all 太陽光発電 related keywords
    console.log('Looking for 太陽光発電 keywords:');
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values[1] && values[1].includes('太陽光発電')) {
        console.log(`  Row ${i + 1}: Pascal ID ${values[0]} - "${values[1]}"`);
        
        // Count data points for this keyword
        let dataCount = 0;
        dateColumns.forEach(({ index }) => {
          if (values[index] && values[index].trim() !== '' && values[index].trim() !== '-') {
            dataCount++;
          }
        });
        console.log(`    Data points: ${dataCount}/${dateColumns.length}`);
      }
    }
    
  } catch (error) {
    console.log('Error reading file:', error.message);
  }
});