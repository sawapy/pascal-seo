# Pascal SEO Analyzer - Authentication Setup

## Google OAuth Configuration

### 1. Google Cloud Console Setup

1. **Create/Select Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing project

2. **Enable Google+ API**
   ```
   - APIs & Services > Library
   - Search for "Google+ API" 
   - Enable the API
   ```

3. **Create OAuth 2.0 Credentials**
   ```
   - APIs & Services > Credentials
   - Create Credentials > OAuth 2.0 Client IDs
   - Application type: Web application
   - Name: Pascal SEO Analyzer
   ```

4. **Configure Authorized Origins**
   ```
   Authorized JavaScript origins:
   - http://localhost:3001 (for development)
   - https://your-production-domain.com (for production)
   ```

5. **Configure Authorized Redirect URIs**
   ```
   Authorized redirect URIs:
   - http://localhost:3001/auth/callback (for development)
   - https://your-production-domain.com/auth/callback (for production)
   ```

### 2. Supabase Authentication Setup

1. **Login to Supabase Dashboard**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project: `wutnzddtdcfzroejpjhc`

2. **Configure Google OAuth Provider**
   ```
   - Authentication > Providers
   - Enable Google provider
   - Add Client ID from Google Cloud Console
   - Add Client Secret from Google Cloud Console
   ```

3. **Configure Site URL and Redirect URLs**
   ```
   Site URL: http://localhost:3001 (development)
   Redirect URLs:
   - http://localhost:3001/auth/callback
   - https://your-production-domain.com/auth/callback
   ```

4. **Domain Restriction (goodfellows.co.jp only)**
   ```
   The domain restriction is handled in the application code:
   - hd parameter in OAuth request
   - Server-side domain validation
   - Automatic sign-out for unauthorized domains
   ```

### 3. Environment Variables

Add to your `.env.local`:

```bash
# Supabase (already configured)
VITE_SUPABASE_URL=https://wutnzddtdcfzroejpjhc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (to be added after creating credentials)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 4. Security Features

**Domain Restriction**
- Only @goodfellows.co.jp email addresses allowed
- `hd` parameter restricts Google account picker
- Server-side validation in auth state listener
- Automatic sign-out for unauthorized users

**Session Management**
- Persistent sessions with Supabase Auth
- Automatic token refresh
- Secure logout functionality

### 5. Testing Authentication

1. **Development Testing**
   ```bash
   npm run dev
   # Visit http://localhost:3001
   # Click "Googleアカウントでログイン"
   # Use @goodfellows.co.jp email for testing
   ```

2. **Error Scenarios to Test**
   - Non-goodfellows.co.jp email (should show error)
   - Network connection issues
   - Invalid OAuth configuration

### 6. Troubleshooting

**Common Issues:**

1. **"unauthorized_client" error**
   - Check authorized origins in Google Cloud Console
   - Verify redirect URIs match exactly

2. **Domain restriction not working**
   - Verify `hd` parameter in OAuth request
   - Check server-side domain validation

3. **Infinite redirect loops**
   - Check Site URL in Supabase matches your domain
   - Verify redirect URLs are configured correctly

4. **"access_denied" error**
   - User cancelled authentication
   - Account may not be from allowed domain

### 7. Production Deployment

1. **Update OAuth Configuration**
   - Add production domain to Google Cloud Console
   - Update Supabase Site URL and Redirect URLs

2. **Environment Variables**
   - Set production environment variables
   - Use production Google OAuth credentials

3. **HTTPS Required**
   - Google OAuth requires HTTPS in production
   - Ensure SSL certificate is properly configured

## Implementation Details

The authentication system uses:
- **Supabase Auth** for session management
- **Google OAuth 2.0** for identity provider
- **Domain restriction** via `hd` parameter and server-side validation
- **React state management** for user session
- **Automatic token refresh** via Supabase

Domain restriction ensures only @goodfellows.co.jp accounts can access the application, making it a secure internal tool.