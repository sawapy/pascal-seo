import React, { useState } from 'react';
import { UserProfile } from '../types';
import { authService, handleAuthError } from '../services/auth';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await authService.signInWithGoogle();
      // The actual login handling is done in the auth state listener in App.tsx
    } catch (err) {
      const errorMessage = handleAuthError(err);
      setError(errorMessage);
      console.error('Google login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 text-indigo-600 text-2xl shadow-md">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <h2 className="text-2xl font-bold text-white">Pascal SEO Analyzer</h2>
          <p className="text-indigo-200 mt-2">社内用ランキング変動分析ツール</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm">
              社内メンバー専用ツールです<br/>
              <span className="text-indigo-600 font-medium">@goodfellows.co.jp</span> アカウントでログインしてください
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fa-solid fa-circle-exclamation text-red-500"></i>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleGoogleLogin} className="space-y-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Googleで認証中...
                </>
              ) : (
                <>
                  <i className="fa-brands fa-google mr-3 text-xl"></i>
                  Googleアカウントでログイン
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              セキュリティのため、goodfellows.co.jp ドメインのアカウントのみがアクセス可能です
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};