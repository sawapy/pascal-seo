
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { RankChart } from './RankChart';
import { CsvUploadModal } from './CsvUploadModal';
import { UserProfile, Keyword, RankingData } from '../types';
import { getPascalKeywordsForDisplay, getPascalRankingData, getPascalKeywordDetails, importPascalCsv, ProgressCallback, pascalKeywordService, getLatestRankingDate } from '../services/pascalSupabase';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { pascalId } = useParams<{ pascalId?: string }>();
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [rankingData, setRankingData] = useState<RankingData[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [keywordDetails, setKeywordDetails] = useState<any>(null);
  
  // Date Range State
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all_time');

  // Removed: AI Analysis State (no longer needed)

  // Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Period calculation function
  const calculatePeriod = (periodType: string) => {
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (periodType) {
      case 'this_week':
        // Monday to today
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(today.getDate() - daysToMonday);
        break;
      case 'last_week':
        // Last Monday to Last Sunday
        const lastWeekEnd = new Date(today);
        const daysToLastSunday = today.getDay() === 0 ? 0 : today.getDay();
        lastWeekEnd.setDate(today.getDate() - daysToLastSunday);
        endDate.setTime(lastWeekEnd.getTime());
        startDate.setDate(lastWeekEnd.getDate() - 6);
        break;
      case 'past_1_month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'past_3_months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'past_6_months':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case 'past_1_year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case 'all_time':
        // Will be handled separately in calculateAllTimePeriod
        return null;
      default:
        // Custom - don't change dates
        return;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  // Separate function for all_time period with database lookup
  const calculateAllTimePeriod = async () => {
    const startDate = '2024-05-01';
    const latestDate = await getLatestRankingDate();
    const endDate = latestDate || new Date().toISOString().split('T')[0];
    
    return {
      start: startDate,
      end: endDate
    };
  };

  // Initialize Dates (All time - from 2024-05-01 to latest data)
  useEffect(() => {
    const initializeDates = async () => {
      const period = await calculateAllTimePeriod();
      if (period) {
        setStartDate(period.start);
        setEndDate(period.end);
      }
    };

    initializeDates();
  }, []);

  // Fetch Keywords on Mount
  const fetchKeywords = useCallback(async () => {
    setIsLoadingKeywords(true);
    try {
      const data = await getPascalKeywordsForDisplay();
      setKeywords(data);
    } catch (error) {
      console.error("Failed to fetch keywords", error);
    } finally {
      setIsLoadingKeywords(false);
    }
  }, []);

  // Handle Pascal ID from URL parameter
  useEffect(() => {
    const handlePascalIdFromUrl = async () => {
      if (pascalId) {
        try {
          const keyword = await pascalKeywordService.getByPascalId(parseInt(pascalId));
          if (keyword) {
            setSelectedKeywordId(keyword.id);
          }
        } catch (error) {
          console.error("Failed to find keyword by Pascal ID", error);
          // If Pascal ID not found, just proceed normally
        }
      }
    };

    handlePascalIdFromUrl();
  }, [pascalId]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // Auto-select first keyword when needed
  useEffect(() => {
    if (keywords.length > 0 && !pascalId && !selectedKeywordId) {
      const firstKeyword = keywords[0];
      setSelectedKeywordId(firstKeyword.id);
      navigate(`/keyword/${firstKeyword.pascal_id}`, { replace: true });
    }
  }, [keywords, pascalId, selectedKeywordId, navigate]);

  // Fetch Keyword Details when selection changes
  useEffect(() => {
    const fetchKeywordDetails = async () => {
      if (!selectedKeywordId) {
        setKeywordDetails(null);
        return;
      }

      try {
        const details = await getPascalKeywordDetails(selectedKeywordId);
        setKeywordDetails(details);
      } catch (error) {
        console.error("Failed to fetch keyword details", error);
        setKeywordDetails(null);
      }
    };

    fetchKeywordDetails();
  }, [selectedKeywordId]);

  // Fetch Ranking Data when selection changes
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedKeywordId || !startDate || !endDate) return;

      setIsLoadingData(true);
      try {
        const data = await getPascalRankingData(selectedKeywordId, startDate, endDate);
        setRankingData(data);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [selectedKeywordId, startDate, endDate]);

  // Period change handlers
  const handlePeriodChange = async (periodType: string) => {
    setSelectedPeriod(periodType);
    
    if (periodType === 'all_time') {
      const period = await calculateAllTimePeriod();
      if (period) {
        setStartDate(period.start);
        setEndDate(period.end);
      }
    } else {
      const period = calculatePeriod(periodType);
      if (period) {
        setStartDate(period.start);
        setEndDate(period.end);
      }
    }
  };

  const handleDateChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setSelectedPeriod('custom'); // Switch to custom when dates are manually changed
  };

  // Handle keyword selection with URL update
  const handleSelectKeyword = (keywordId: string) => {
    const keyword = keywords.find(k => k.id === keywordId);
    if (keyword) {
      setSelectedKeywordId(keywordId);
      // Update URL with Pascal ID
      navigate(`/keyword/${keyword.pascal_id}`, { replace: true });
    }
  };

  const handleImportCsv = async (csvContent: string, progressCallback?: ProgressCallback) => {
    try {
      // Import Pascal CSV data with progress tracking
      const result = await importPascalCsv(csvContent, progressCallback);
      
      if (!result.success && result.errors.length > 0) {
        throw new Error(result.errors.join('\n'));
      }

      // Refresh keywords list
      await fetchKeywords(false);
      
      console.log(`Import successful: ${result.summary}`);
      if (result.errors.length > 0) {
        console.warn('Import warnings:', result.errors);
      }
    } catch (e) {
      console.error("Import failed", e);
      throw e;
    }
  };

  const selectedKeyword = keywords.find(k => k.id === selectedKeywordId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        keywords={keywords}
        selectedKeywordId={selectedKeywordId}
        onSelectKeyword={handleSelectKeyword}
        onOpenImport={() => setIsImportModalOpen(true)}
        isLoading={isLoadingKeywords}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-indigo-600 tracking-tight">
                  <i className="fa-solid fa-chart-line mr-2"></i>
                  Pascal SEO Trends
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                  <span>{user.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                    @goodfellows.co.jp
                  </span>
                </div>
                {user.avatarUrl && (
                  <img className="h-8 w-8 rounded-full border border-gray-200" src={user.avatarUrl} alt="User avatar" />
                )}
                <button 
                  onClick={onLogout}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
                  title="Logout"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Control Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedKeyword?.term || 'キーワードを選択してください'}
                </h2>
                <p className="text-sm text-gray-500">順位変動推移</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Period Selector Dropdown */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 font-medium">期間:</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="this_week">今週</option>
                    <option value="last_week">先週</option>
                    <option value="past_1_month">過去1ヶ月</option>
                    <option value="past_3_months">過去3ヶ月</option>
                    <option value="past_6_months">過去6ヶ月</option>
                    <option value="past_1_year">過去1年</option>
                    <option value="all_time">全期間</option>
                    <option value="custom">カスタム</option>
                  </select>
                </div>

                {/* Debug Button - Temporary */}

                {/* Date Range Inputs - Show when Custom is selected */}
                <div className={`flex items-center space-x-2 transition-all duration-200 ${
                  selectedPeriod === 'custom' ? 'opacity-100' : 'opacity-50 pointer-events-none'
                }`}>
                  <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-md border border-gray-200">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => handleDateChange(e.target.value, endDate)}
                      className="bg-transparent text-sm border-none focus:ring-0 text-gray-700"
                    />
                    <span className="text-gray-400">→</span>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => handleDateChange(startDate, e.target.value)}
                      className="bg-transparent text-sm border-none focus:ring-0 text-gray-700"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Chart Area - Full Width */}
            <div className="space-y-6">
              <RankChart 
                data={rankingData} 
                isLoading={isLoadingData}
                startDate={startDate}
                endDate={endDate}
              />
              
              {/* Keyword Details Table */}
              {selectedKeyword && keywordDetails && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">キーワード詳細情報</h3>
                  </div>
                  <div className="p-0">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">月間検索数</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ドメイン/URL</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サイト名</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位設定</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">エリア</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">種別</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ランディングページ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {keywordDetails.monthly_search_volume ? keywordDetails.monthly_search_volume.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={keywordDetails.domain_url || ''}>
                            {keywordDetails.domain_url || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {keywordDetails.site_name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {keywordDetails.rank_type || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {keywordDetails.area || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {keywordDetails.device_type || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={keywordDetails.landing_page || ''}>
                            {keywordDetails.landing_page || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Data Table Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                 <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                   <h3 className="text-sm font-semibold text-gray-700">データ履歴</h3>
                   <span className="text-xs text-gray-500">{rankingData.length}件のデータ</span>
                 </div>
                 <div className="max-h-60 overflow-y-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50 sticky top-0">
                       <tr>
                         <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">取得日</th>
                         <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順位</th>
                         <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">変動</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {rankingData.slice().reverse().map((row, idx) => {
                         // Calculate diff from next item (which is previous date in reversed list)
                         const prevRank = rankingData[rankingData.length - 1 - idx - 1]?.rank;
                         const diff = prevRank ? prevRank - row.rank : 0;
                         
                         return (
                           <tr key={idx}>
                             <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">{row.date}</td>
                             <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{row.rank}位</td>
                             <td className="px-6 py-2 whitespace-nowrap text-sm">
                               {diff > 0 ? (
                                 <span className="text-green-600"><i className="fa-solid fa-arrow-up mr-1"></i>{diff}</span>
                               ) : diff < 0 ? (
                                 <span className="text-red-600"><i className="fa-solid fa-arrow-down mr-1"></i>{Math.abs(diff)}</span>
                               ) : (
                                 <span className="text-gray-400">-</span>
                               )}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      <CsvUploadModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onUpload={handleImportCsv}
      />
    </div>
  );
};
