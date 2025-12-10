import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { RankingData } from '../types';

type TimeAggregation = 'daily' | 'weekly' | 'monthly';

interface RankChartProps {
  data: RankingData[];
  isLoading: boolean;
  startDate?: string;
  endDate?: string;
}

interface AggregatedData {
  date: string;
  rank: number | null;
  avgRank: number;
  minRank: number;
  maxRank: number;
  dataPoints: number;
  isOutOfRange?: boolean;
}

export const RankChart: React.FC<RankChartProps> = ({ data, isLoading, startDate, endDate }) => {
  const [aggregation, setAggregation] = useState<TimeAggregation>('daily');

  // Generate complete date range helper function
  const generateDateRange = (start: Date, end: Date) => {
    const dates = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(new Date(currentDate).toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Aggregate data based on selected time period
  const aggregatedData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Determine date range
    let dateRangeStart: Date;
    let dateRangeEnd: Date;
    
    if (startDate && endDate) {
      dateRangeStart = new Date(startDate);
      dateRangeEnd = new Date(endDate);
    } else if (sortedData.length > 0) {
      dateRangeStart = new Date(sortedData[0].date);
      dateRangeEnd = new Date(sortedData[sortedData.length - 1].date);
    } else {
      return [];
    }

    if (aggregation === 'daily') {
      // Create a map of existing data
      const dataMap = new Map<string, RankingData>();
      sortedData.forEach(item => {
        dataMap.set(item.date, item);
      });
      
      // Generate complete date range
      const allDates = generateDateRange(dateRangeStart, dateRangeEnd);
      
      return allDates.map(date => {
        const existingData = dataMap.get(date);
        if (existingData) {
          return {
            ...existingData,
            avgRank: existingData.rank,
            minRank: existingData.rank,
            maxRank: existingData.rank,
            dataPoints: 1,
            isOutOfRange: false
          };
        } else {
          return {
            date,
            rank: null,
            avgRank: 101, // Out of range value for display
            minRank: 101,
            maxRank: 101,
            dataPoints: 0,
            isOutOfRange: true
          };
        }
      });
    }

    // Generate complete period range for weekly/monthly
    const generatePeriodRange = (start: Date, end: Date, type: 'weekly' | 'monthly') => {
      const periods = [];
      const current = new Date(start);

      if (type === 'weekly') {
        // Start from Monday of the first week
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        current.setDate(diff);

        while (current <= end) {
          periods.push(new Date(current).toISOString().split('T')[0]);
          current.setDate(current.getDate() + 7);
        }
      } else {
        // Monthly: start from the 1st of the first month
        current.setDate(1);

        while (current <= end) {
          periods.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`);
          current.setMonth(current.getMonth() + 1);
        }
      }

      return periods;
    };

    // Group existing data by week or month
    const groups = new Map<string, RankingData[]>();

    sortedData.forEach(item => {
      const date = new Date(item.date);
      let groupKey: string;

      if (aggregation === 'weekly') {
        // Get start of week (Monday)
        const startOfWeek = new Date(date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        groupKey = startOfWeek.toISOString().split('T')[0];
      } else {
        // Monthly aggregation
        groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    // Generate all periods in range
    const allPeriods = generatePeriodRange(dateRangeStart, dateRangeEnd, aggregation);

    // Calculate aggregated values for all periods
    const result: AggregatedData[] = allPeriods.map(periodKey => {
      const groupData = groups.get(periodKey);
      
      if (groupData && groupData.length > 0) {
        const ranks = groupData.map(item => item.rank);
        const avgRank = Math.round(ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length);
        const minRank = Math.min(...ranks);
        const maxRank = Math.max(...ranks);

        return {
          date: periodKey,
          rank: avgRank,
          avgRank,
          minRank,
          maxRank,
          dataPoints: ranks.length,
          isOutOfRange: false
        };
      } else {
        return {
          date: periodKey,
          rank: null,
          avgRank: 101,
          minRank: 101,
          maxRank: 101,
          dataPoints: 0,
          isOutOfRange: true
        };
      }
    });

    return result;
  }, [data, aggregation, startDate, endDate]);

  // Check if data spans multiple years
  const spansMultipleYears = useMemo(() => {
    if (aggregatedData.length === 0) return false;
    const years = new Set(aggregatedData.map(item => new Date(item.date).getFullYear()));
    return years.size > 1;
  }, [aggregatedData]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (aggregatedData.length === 0) return [1, 'auto'];
    
    const validRanks = aggregatedData
      .filter(item => !item.isOutOfRange && item.rank !== null)
      .map(item => item.rank!);
    
    if (validRanks.length === 0) {
      // Only out-of-range data, use default range (don't show 圏外 on Y-axis)
      return [1, 100];
    }
    
    const maxRank = Math.max(...validRanks);
    const hasOutOfRange = aggregatedData.some(item => item.isOutOfRange);
    
    // Always use actual data range, ignore out-of-range data
    return [1, maxRank + 5];
  }, [aggregatedData]);

  // Custom tooltip for showing "圏外" when rank is null
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formattedDate = formatDate(label);
      
      return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
          <p className="text-sm text-gray-600 font-medium">{formattedDate}</p>
          <div className="mt-1">
            {data.isOutOfRange ? (
              <p className="text-sm text-gray-500 font-medium">
                <span className="inline-block w-3 h-3 bg-gray-300 rounded-full mr-2"></span>
                圏外
              </p>
            ) : (
              <p className="text-sm text-blue-600 font-medium">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                {data.rank}位
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot renderer - only show dots for actual rank data
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isOutOfRange = payload?.isOutOfRange;
    
    // Don't render dot for out-of-range data
    if (isOutOfRange) {
      return null;
    }
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#4f46e5"
        stroke="#4f46e5"
        strokeWidth={2}
      />
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (aggregation === 'monthly') {
      return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' });
    } else if (aggregation === 'weekly') {
      if (spansMultipleYears) {
        return date.toLocaleDateString('ja-JP', { year: '2-digit', month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      }
    } else {
      // Daily view
      if (spansMultipleYears) {
        return date.toLocaleDateString('ja-JP', { year: '2-digit', month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 border-dashed">
        <p className="text-sm text-gray-500">表示するデータがありません。</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Header with time aggregation controls */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">順位変動推移</h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setAggregation('daily')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              aggregation === 'daily'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            日次
          </button>
          <button
            onClick={() => setAggregation('weekly')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              aggregation === 'weekly'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            週次
          </button>
          <button
            onClick={() => setAggregation('monthly')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              aggregation === 'monthly'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            月次
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={aggregatedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickMargin={10}
              stroke="#94a3b8"
            />
            <YAxis 
              reversed={true} // Rank 1 is at the top
              domain={yAxisDomain}
              tick={{ fontSize: 12, fill: '#64748b' }}
              stroke="#94a3b8"
              label={{ value: '順位', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
              tickFormatter={(value) => value >= 101 ? '圏外' : value.toString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={10} label="Top 10" stroke="#22c55e" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rank"
              stroke="#4f46e5"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      {aggregatedData.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
          <span>データポイント: {aggregatedData.length}件</span>
          {aggregation !== 'daily' && (
            <span>
              平均{aggregation === 'weekly' ? '週' : '月'}次データポイント: {
                Math.round(data.length / aggregatedData.length * 10) / 10
              }件
            </span>
          )}
        </div>
      )}
    </div>
  );
};