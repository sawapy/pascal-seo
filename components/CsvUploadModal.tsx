
import React, { useState, useRef } from 'react';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (csvContent: string, progressCallback?: (current: number, total: number, message: string) => void) => Promise<void>;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setErrorMessage('CSVファイルのみアップロード可能です。');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('idle');
    setIsUploading(true);
    setErrorMessage('');

    // First try to read as Shift-JIS (Pascal CSV default encoding)
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      let content: string;
      
      // Try Shift-JIS first (Pascal default)
      try {
        const decoder = new TextDecoder('shift_jis');
        content = decoder.decode(buffer);
        
        // Check if the decode was successful by looking for Japanese characters
        if (!content.includes('キーワード') && !content.includes('Pascal')) {
          // Fallback to UTF-8
          const utf8Decoder = new TextDecoder('utf-8');
          content = utf8Decoder.decode(buffer);
        }
      } catch (decodeError) {
        // Fallback to UTF-8
        try {
          const utf8Decoder = new TextDecoder('utf-8');
          content = utf8Decoder.decode(buffer);
        } catch (utf8Error) {
          setErrorMessage('ファイルのエンコーディングを判別できませんでした。');
          setUploadStatus('error');
          setIsUploading(false);
          return;
        }
      }
      
      try {
        setUploadStatus('processing');
        setProgress({ current: 0, total: 10, message: 'CSVを解析中...' });
        
        // Progress callback function
        const progressCallback = (current: number, total: number, message: string) => {
          setProgress({ current, total, message });
        };
        
        await onUpload(content, progressCallback);
        
        setUploadStatus('success');
        setProgress({ current: 10, total: 10, message: 'インポート完了' });
        setTimeout(() => {
          onClose();
          setUploadStatus('idle');
          setProgress({ current: 0, total: 0, message: '' });
        }, 2000);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。');
        setUploadStatus('error');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('ファイルの読み込みエラーが発生しました。');
      setUploadStatus('error');
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                <i className="fa-solid fa-file-csv text-indigo-600"></i>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Pascal CSVの一括インポート
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    PascalからエクスポートしたCSVファイルをアップロードして、<br/>
                    キーワードと日次順位データを一括登録します。
                  </p>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                      ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
                      ${uploadStatus === 'error' ? 'border-red-300 bg-red-50' : ''}
                      ${uploadStatus === 'success' ? 'border-green-300 bg-green-50' : ''}
                    `}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileSelect}
                    />
                    
                    {uploadStatus === 'processing' ? (
                      <div className="space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700 font-medium">{progress.message}</p>
                          {progress.total > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                              ></div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">
                            大量データの処理には時間がかかる場合があります...
                          </p>
                        </div>
                      </div>
                    ) : isUploading ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-sm text-gray-600">ファイルを読み込み中...</p>
                      </div>
                    ) : uploadStatus === 'success' ? (
                      <div className="space-y-2">
                        <i className="fa-solid fa-check-circle text-3xl text-green-500"></i>
                        <p className="text-sm text-green-700 font-medium">登録完了しました！</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <i className={`fa-solid fa-cloud-arrow-up text-3xl ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`}></i>
                        <p className="text-sm text-gray-600 font-medium">
                          クリックしてファイルを選択<br/>
                          またはドラッグ＆ドロップ
                        </p>
                        <p className="text-xs text-gray-400">Pascal CSV形式</p>
                      </div>
                    )}
                  </div>
                  
                  {errorMessage && (
                    <p className="mt-2 text-sm text-red-600 text-center">{errorMessage}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
