import React, { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  showProfileCompletion: boolean;
  setShowProfileCompletion: (show: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  signup: (data: SignupFormData) => Promise<{ success: boolean; error?: string; verificationStatus?: any }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhone: (token: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (type: 'email' | 'phone') => Promise<{ success: boolean; error?: string }>;
  uploadProfilePicture: (file: File) => Promise<{ success: boolean; error?: string }>;
  completeGoogleProfile: (data: GoogleProfileData) => Promise<{ success: boolean; error?: string }>;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  cnic: string;
  phone: string;
  country: string;
  address: string;
}

interface GoogleProfileData {
  cnic: string;
  phone: string;
  address: string;
  country?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api/auth';

// Helper function to make authenticated requests
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('sitenest_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('sitenest_token');
    localStorage.removeItem('sitenest_user');
    window.location.reload();
    return null;
  }

  return response;
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('sitenest_token');
    const storedUser = localStorage.getItem('sitenest_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('sitenest_token');
        localStorage.removeItem('sitenest_user');
      }
    }

    // Development mode: Log when no user is logged in (removed auto-login)
    if (!storedToken && !storedUser && import.meta.env.DEV) {
      console.log('Development mode: No user logged in - manual authentication required');
    }

    // Helper function to get cookie value
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // Check for Google OAuth callback (now using cookies instead of URL params)
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const completeProfile = urlParams.get('completeProfile');
    const affiliateRef = urlParams.get('ref');

    // Check for authentication data in cookies
    const cookieToken = getCookie('auth_token');
    const cookieUserData = getCookie('user_data');

    console.log('OAuth callback check:', {
      authSuccess,
      hasCookieToken: !!cookieToken,
      hasCookieUserData: !!cookieUserData,
      completeProfile,
      affiliateRef
    });

    if (authSuccess === 'success') {
      if (cookieToken && cookieUserData) {
        try {
          const userData = JSON.parse(decodeURIComponent(cookieUserData));
          console.log('Processing OAuth success with user data:', userData);

          setToken(cookieToken);
          setUser(userData);
          localStorage.setItem('sitenest_token', cookieToken);
          localStorage.setItem('sitenest_user', JSON.stringify(userData));

          // Store affiliate reference in localStorage if it exists
          if (affiliateRef) {
            localStorage.setItem('sitenest_affiliate_ref', affiliateRef);
          }

          // Clean up URL (remove OAuth params but let affiliate pricing hook handle ref)
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          if (completeProfile === 'true') {
            // Show profile completion modal
            setShowProfileCompletion(true);
          }

          // Clear the authentication cookies after successful processing
          document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'user_data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

          console.log('OAuth authentication completed successfully');
        } catch (error) {
          console.error('Error processing Google OAuth callback:', error);
        }
      } else {
        console.error('OAuth success but missing cookies:', {
          cookieToken: cookieToken ? 'present' : 'missing',
          cookieUserData: cookieUserData ? 'present' : 'missing',
          allCookies: document.cookie
        });
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('sitenest_token', data.token);
        localStorage.setItem('sitenest_user', JSON.stringify(data.user));

        return {
          success: true,
          requiresVerification: data.requiresVerification
        };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signup = async (data: SignupFormData) => {
    try {
      const response = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem('sitenest_token', result.token);
        localStorage.setItem('sitenest_user', JSON.stringify(result.user));

        return {
          success: true,
          verificationStatus: result.verificationStatus
        };
      } else {
        return { success: false, error: result.error || 'Signup failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    // Preserve affiliate reference before clearing user data
    const affiliateRef = localStorage.getItem('sitenest_affiliate_ref');

    setUser(null);
    setToken(null);
    localStorage.removeItem('sitenest_token');
    localStorage.removeItem('sitenest_user');

    // Restore affiliate reference after clearing user data
    if (affiliateRef) {
      localStorage.setItem('sitenest_affiliate_ref', affiliateRef);
    }

    // Call logout endpoint to handle any server-side cleanup
    makeAuthenticatedRequest(`${API_BASE}/logout`, { method: 'POST' });

    // Always redirect to home page after logout, preserving affiliate ref if it exists
    const redirectUrl = affiliateRef ? `/?ref=${affiliateRef}` : '/';
    window.location.href = redirectUrl;
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();

      if (response.ok) {
        setUser(result.user);
        localStorage.setItem('sitenest_user', JSON.stringify(result.user));

        // Trigger user update event
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { user: result.user }
        }));

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Profile update failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword: newPassword }),
      });

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Password change failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/verify-email`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();

      if (response.ok) {
        // Update user data with verified email status
        if (result.user) {
          setUser(result.user);
          localStorage.setItem('sitenest_user', JSON.stringify(result.user));

          // Trigger user update event
          window.dispatchEvent(new CustomEvent('userUpdated', {
            detail: { user: result.user }
          }));
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Email verification failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyPhone = async (token: string) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/verify-phone`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      });

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();

      if (response.ok) {
        // Update user data with verified phone status
        if (result.user) {
          setUser(result.user);
          localStorage.setItem('sitenest_user', JSON.stringify(result.user));

          // Trigger user update event
          window.dispatchEvent(new CustomEvent('userUpdated', {
            detail: { user: result.user }
          }));
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Phone verification failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resendVerification = async (type: 'email' | 'phone') => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/resend-verification`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        // Handle WhatsApp-specific errors
        if (result.error && result.error.includes('join sitenest')) {
          return {
            success: false,
            error: 'Please send "join sitenest" to +14155238886 on WhatsApp first to enable verification messages.'
          };
        }
        return { success: false, error: result.error || 'Resend failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const uploadProfilePicture = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('sitenest_token');
      const response = await fetch(`${API_BASE}/upload-profile-picture`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (!response.ok && response.status === 401) {
        localStorage.removeItem('sitenest_token');
        localStorage.removeItem('sitenest_user');
        window.location.reload();
        return { success: false, error: 'Authentication failed' };
      }

      const result = await response.json();

      if (response.ok) {
        setUser(result.user);
        localStorage.setItem('sitenest_user', JSON.stringify(result.user));

        // Trigger user update event
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { user: result.user }
        }));

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Upload failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const completeGoogleProfile = async (data: GoogleProfileData) => {
    try {
      console.log('Completing Google profile with data:', data);
      console.log('Token from localStorage:', localStorage.getItem('sitenest_token') ? 'Token exists' : 'No token');

      const response = await makeAuthenticatedRequest(`${API_BASE}/google/complete-profile`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('Response received:', response ? 'Response exists' : 'No response');

      if (!response) return { success: false, error: 'Authentication failed' };

      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        setUser(result.user);
        localStorage.setItem('sitenest_user', JSON.stringify(result.user));
        setShowProfileCompletion(false);

        // Trigger user update event
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { user: result.user }
        }));

        return { success: true };
      } else {
        console.log('Response not ok:', response.status, result);
        return { success: false, error: result.error || 'Profile completion failed' };
      }
    } catch (error) {
      console.error('Complete profile error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    showProfileCompletion,
    setShowProfileCompletion,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    verifyEmail,
    verifyPhone,
    resendVerification,
    uploadProfilePicture,
    completeGoogleProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useRealAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useRealAuth must be used within an AuthProvider');
  }
  return context;
};