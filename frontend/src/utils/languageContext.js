import React, { createContext, useContext, useState } from 'react';

export const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('dcms_language') || 'en');

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('dcms_language', lang);
  };

  const t = (key) => {
    // Simplified translation - just return the key for now
    // Full implementation would use the translations object
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(LanguageContext);
};

