import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const sessionUser = await authAPI.me();
        if (cancelled) return;
        if (sessionUser) {
          setUser(sessionUser);
          localStorage.setItem('user', JSON.stringify(sessionUser));
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch {
        if (cancelled) return;
        setUser(null);
        localStorage.removeItem('user');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    try {
      const userData = await authAPI.login(credentials);
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const newUser = await authAPI.register(userData);
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    } catch (error) {
      throw error;
    }
  };

  const createDevSession = async (options = {}) => {
    const payload = await authAPI.createDevSession(options);
    const devUser = payload?.user || payload;
    setUser(devUser);
    localStorage.setItem('user', JSON.stringify(devUser));
    return payload;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // 세션이 이미 만료된 경우에도 클라이언트 상태는 정리한다.
    }
    setUser(null);
    localStorage.removeItem('user');
  };

  const withdraw = async () => {
    try {
      return await authAPI.withdraw();
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  const value = {
    user,
    isLoggedIn: !!user,
    isLoading,
    login,
    register,
    createDevSession,
    logout,
    withdraw,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
