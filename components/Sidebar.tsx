
import React from 'react';
import { Keyword } from '../types';

interface SidebarProps {
  keywords: Keyword[];
  selectedKeywordId: string | null;
  onSelectKeyword: (id: string) => void;
  onOpenImport: () => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  keywords, 
  selectedKeywordId, 
  onSelectKeyword, 
  onOpenImport,
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredKeywords = keywords.filter(k => 
    k.term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            登録キーワード
          </h2>
          <button
            onClick={onOpenImport}
            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center transition-colors"
            title="CSVで一括登録"
          >
            <i className="fa-solid fa-file-csv mr-1"></i> インポート
          </button>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fa-solid fa-search text-gray-400 text-sm"></i>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="キーワードを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredKeywords.map(keyword => (
              <li key={keyword.id}>
                <button
                  onClick={() => onSelectKeyword(keyword.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors focus:outline-none ${
                    selectedKeywordId === keyword.id 
                      ? 'bg-indigo-50 border-l-4 border-indigo-600' 
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-sm font-medium ${selectedKeywordId === keyword.id ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {keyword.term}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      keyword.currentRank && keyword.currentRank <= 3 ? 'bg-yellow-100 text-yellow-800' :
                      keyword.currentRank && keyword.currentRank <= 10 ? 'bg-green-100 text-green-800' :
                      keyword.currentRank ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {keyword.currentRank ? `${keyword.currentRank}位` : '圏外'}
                    </span>
                  </div>
                  {keyword.volume && (
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <i className="fa-solid fa-users mr-1"></i> Vol: {keyword.volume.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        {keyword.siteName && (
                          <span className="truncate max-w-12" title={keyword.siteName}>
                            {keyword.siteName}
                          </span>
                        )}
                        {keyword.deviceType && (
                          <span className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                            {keyword.deviceType}
                          </span>
                        )}
                        {keyword.rankType && (
                          <span className="text-xs">
                            {keyword.rankType}
                          </span>
                        )}
                        {keyword.area && keyword.area !== '指定なし' && (
                          <span className="text-xs">
                            {keyword.area}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            ))}
            {filteredKeywords.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="text-gray-300 mb-2 text-2xl">
                  <i className="fa-solid fa-folder-open"></i>
                </div>
                <p className="text-gray-500 text-sm mb-2">
                  キーワードが見つかりません
                </p>
                <button 
                  onClick={onOpenImport}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium underline"
                >
                  CSVから登録する
                </button>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
