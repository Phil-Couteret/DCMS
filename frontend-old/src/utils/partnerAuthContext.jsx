import React, { createContext, useContext, useState, useEffect } from 'react';
import { httpClient } from '../services/api/httpClient';

const PartnerAuthContext = createContext(null);

export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (!context) {
    throw new Error('usePartnerAuth must be used within a PartnerAuthProvider');
  }
  return context;
};

export const PartnerAuthProvider = ({ children }) => {
  const [partner, setPartner] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('partner_token');
    const storedPartner = localStorage.getItem('partner_data');
    
    if (storedToken && storedPartner) {
      try {
        setToken(storedToken);
        setPartner(JSON.parse(storedPartner));
        // Set token in httpClient for authenticated requests
        httpClient.setAuthToken(storedToken, 'partner');
      } catch (error) {
        console.error('Error loading stored partner auth:', error);
        localStorage.removeItem('partner_token');
        localStorage.removeItem('partner_data');
      }
    }
    setLoading(false);
  }, []);

  const login = async (identifier, apiSecret, method = 'apiKey') => {
    try {
      const loginData = method === 'email' 
        ? { email: identifier, apiSecret }
        : { apiKey: identifier, apiSecret };
      
      const response = await httpClient.post('/partner-auth/login', loginData);

      // httpClient.post returns the parsed JSON directly, not { data: ... }
      const { access_token, partner: partnerData } = response;
      
      setToken(access_token);
      setPartner(partnerData);
      localStorage.setItem('partner_token', access_token);
      localStorage.setItem('partner_data', JSON.stringify(partnerData));
      httpClient.setAuthToken(access_token, 'partner');

      return { success: true };
    } catch (error) {
      console.error('Partner login error:', error);
      // Extract error message from various possible error formats
      let errorMessage = 'Login failed';
      if (error.message) {
        errorMessage = error.message;
        // If it's an API error message, extract the actual message
        if (error.message.includes(':')) {
          const parts = error.message.split(':');
          if (parts.length > 1) {
            errorMessage = parts.slice(1).join(':').trim();
          }
        }
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const logout = () => {
    setPartner(null);
    setToken(null);
    localStorage.removeItem('partner_token');
    localStorage.removeItem('partner_data');
    httpClient.setAuthToken(null);
  };

  const isAuthenticated = () => {
    return !!partner && !!token;
  };

  return (
    <PartnerAuthContext.Provider
      value={{
        partner,
        token,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </PartnerAuthContext.Provider>
  );
};
