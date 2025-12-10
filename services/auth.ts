import { supabase } from './supabase';
import { UserProfile } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    name?: string;
  };
}

// Check if email domain is allowed
function isAllowedDomain(email: string): boolean {
  return email.endsWith('@goodfellows.co.jp');
}

// Convert Supabase user to UserProfile
function convertToUserProfile(user: AuthUser): UserProfile {
  const name = user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.email.split('@')[0];
  
  return {
    email: user.email,
    name: name,
    avatarUrl: user.user_metadata?.avatar_url
  };
}

// Authentication service
export const authService = {
  // Sign in with Google OAuth
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          hd: 'goodfellows.co.jp' // Restrict to goodfellows.co.jp domain (Frontend UX)
        },
        redirectTo: `${window.location.origin}` // Redirect back to app root
      }
    });

    if (error) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }

    return data;
  },

  // Get current user session
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Get user error:', error);
        return null;
      }

      if (!user || !user.email) {
        return null;
      }

      // Check domain restriction
      if (!isAllowedDomain(user.email)) {
        console.warn('User domain not allowed:', user.email);
        await this.signOut(); // Automatically sign out unauthorized users
        throw new Error('このドメインのメールアドレスは許可されていません');
      }

      return convertToUserProfile(user as AuthUser);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: UserProfile | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      if (event === 'SIGNED_OUT') {
        callback(null);
        return;
      }

      if (session?.user) {
        try {
          // Check domain restriction
          if (!session.user.email || !isAllowedDomain(session.user.email)) {
            console.warn('Unauthorized domain:', session.user.email);
            await this.signOut();
            throw new Error('このドメインのメールアドレスは許可されていません');
          }

          const userProfile = convertToUserProfile(session.user as AuthUser);
          callback(userProfile);
        } catch (error) {
          console.error('Auth state change error:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
};

// Utility function to handle auth errors
export function handleAuthError(error: any): string {
  if (error?.message) {
    // Domain restriction error from PostgreSQL trigger
    if (error.message.includes('このドメインのアドレスは許可されていません')) {
      return '@goodfellows.co.jp のメールアドレスでログインしてください。';
    }
    
    // Other specific error messages
    if (error.message.includes('unauthorized_client')) {
      return 'OAuth設定エラーです。管理者にお問い合わせください。';
    }
    
    if (error.message.includes('access_denied')) {
      return 'ログインがキャンセルされました。';
    }
    
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '認証エラーが発生しました。@goodfellows.co.jp のメールアドレスでお試しください。';
}