import React from 'react';
import { Select, MenuItem, FormControl, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <Select
        value={i18n.language || 'en'}
        onChange={handleLanguageChange}
        sx={{ 
          color: 'white',
          '& .MuiSelect-icon': { color: 'white' },
          '&:before': { borderColor: 'white' },
          '&:after': { borderColor: 'white' }
        }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;

