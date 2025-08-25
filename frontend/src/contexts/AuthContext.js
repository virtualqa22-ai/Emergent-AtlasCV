import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('atlascv_token'));
  const [loading, setLoading] = useState(true);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const API = `${BACKEND_URL}/api`;

  // Anonymous resume data management
  const saveAnonymousResume = (resumeData) => {
    localStorage.setItem('atlascv_anonymous_resume', JSON.stringify(resumeData));
  };

  const getAnonymousResume = () => {
    const data = localStorage.getItem('atlascv_anonymous_resume');
    return data ? JSON.parse(data) : null;
  };

  const clearAnonymousResume = () => {
    localStorage.removeItem('atlascv_anonymous_resume');
  };

  // Set up axios interceptor to include token
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token && config.url?.startsWith(API)) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token, API]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Token validation failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token, API]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/signin`, {
        email,
        password
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('atlascv_token', access_token);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const signup = async (email, password, fullName) => {
    try {
      const response = await axios.post(`${API}/auth/signup`, {
        email,
        password,
        full_name: fullName
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('atlascv_token', access_token);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Signup failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Signup failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('atlascv_token');
  };

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${API}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('atlascv_token', access_token);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    refreshToken,
    isAuthenticated: !!user,
    // Anonymous resume functions
    saveAnonymousResume,
    getAnonymousResume,
    clearAnonymousResume
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};