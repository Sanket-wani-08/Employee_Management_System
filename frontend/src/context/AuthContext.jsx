import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user session from localStorage on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user_info');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse user session:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
      }
    }
    setLoading(false);
  }, []);

  // Login handler
  const login = async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    const { access, refresh, user: userData } = response.data;

    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_info', JSON.stringify(userData));

    setToken(access);
    setUser(userData);
    return userData;
  };

  // Register handler
  const register = async (registrationData) => {
    const response = await api.post('/auth/register/', registrationData);
    const { tokens, user: userData } = response.data;

    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    localStorage.setItem('user_info', JSON.stringify(userData));

    setToken(tokens.access);
    setUser(userData);
    return userData;
  };

  // Logout handler
  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout/', { refresh: refreshToken });
      }
    } catch (err) {
      console.warn('Backend logout notification skipped:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      setToken(null);
      setUser(null);
    }
  };

  // Role helper flags
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser === true;
  const isHR = user?.role === 'HR' || isAdmin;
  const isProjectManager = user?.role === 'PROJECT_MANAGER' || isAdmin;
  const isEmployee = user?.role === 'EMPLOYEE';

  const hasRole = (allowedRoles = []) => {
    if (!user) return false;
    if (isAdmin) return true;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isHR,
        isProjectManager,
        isEmployee,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

