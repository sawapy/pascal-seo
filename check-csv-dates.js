import fs from 'fs';

// Check June CSV file
const csvPath = '/Users/oosawashunsuke/Downloads/ranking_20251128175830_202406.csv';
import iconv from 'iconv-lite';

const buffer = fs.readFileSync(csvPath);
const content = iconv.decode(buffer, 'Shift_JIS');
const lines = content.split('\n');
const headers = lines[0].split(',');

console.log('Total columns:', headers.length);
console.log('\nDate columns found:');

const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
headers.forEach((header, index) => {
  if (datePattern.test(header)) {
    const match = header.match(datePattern);
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dateString = date.toISOString().split('T')[0];
    console.log(`Column ${index}: "${header.trim()}" -> ${dateString}`);
  }
});

// Check row 205 (太陽光発電)
console.log('\n=== Row 205 (太陽光発電) data ===');
const row205 = lines[204]; // 0-indexed
if (row205) {
  const values = row205.split(',');
  console.log('Keyword:', values[1]); // Column B is keyword
  console.log('Pascal ID:', values[0]); // Column A is Pascal ID
  
  // Check date columns for values
  let valueCount = 0;
  headers.forEach((header, index) => {
    if (datePattern.test(header) && values[index] && values[index].trim() !== '' && values[index].trim() !== '-') {
      const match = header.match(datePattern);
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      const dateString = date.toISOString().split('T')[0];
      console.log(`  ${dateString}: rank ${values[index].trim()}`);
      valueCount++;
    }
  });
  console.log(`Total dates with values: ${valueCount}`);
}