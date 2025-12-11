// Debug script to check device types
import { supabase } from './services/supabase.js';

async function checkDeviceTypes() {
  try {
    // Get distinct device types
    const { data: deviceTypes, error: deviceError } = await supabase
      .from('pascal_keywords')
      .select('device_type')
      .not('device_type', 'is', null);

    if (deviceError) {
      console.error('Error fetching device types:', deviceError);
      return;
    }

    // Count occurrences of each device type
    const deviceTypeCounts = {};
    deviceTypes.forEach(row => {
      const deviceType = row.device_type;
      deviceTypeCounts[deviceType] = (deviceTypeCounts[deviceType] || 0) + 1;
    });

    console.log('Device type distribution:');
    Object.entries(deviceTypeCounts).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });

    // Get some sample records to see the data
    const { data: samples, error: sampleError } = await supabase
      .from('pascal_keywords')
      .select('pascal_id, keyword_text, device_type, rank_type')
      .limit(10);

    if (sampleError) {
      console.error('Error fetching samples:', sampleError);
      return;
    }

    console.log('\nSample records:');
    samples.forEach(sample => {
      console.log(`- ID: ${sample.pascal_id}, Keyword: ${sample.keyword_text}, Device: ${sample.device_type}, Rank: ${sample.rank_type}`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDeviceTypes();