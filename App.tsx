import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { authService } from './services/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Initialize authentication
    const initAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // Wait for Supabase to process URL fragments/params
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check for existing session
        const currentUser = await authService.getCurrentUser();
        console.log('🔄 Auth init result:', currentUser ? 'User found' : 'No user');
        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : 'Authentication failed');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: authListener } = authService.onAuthStateChange((user) => {
      console.log('🔄 Auth state changed:', user ? 'User found' : 'No user');
      if (mounted) {
        setUser(user);
        setAuthError(null);
      }
    });

    initAuth();

    // Cleanup
    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setAuthError(null);
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md">
            <i className="fa-solid fa-exclamation-triangle text-red-500 text-2xl mb-3"></i>
            <h2 className="text-lg font-semibold text-red-800 mb-2">認証エラー</h2>
            <p className="text-red-700 text-sm mb-4">{authError}</p>
            <button
              onClick={() => {
                setAuthError(null);
                window.location.reload();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-slate-800">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
            <Route path="/keyword/:pascalId" element={<Dashboard user={user} onLogout={handleLogout} />} />
          </Routes>
        )}
      </div>
    </Router>
  );
};

export default App;