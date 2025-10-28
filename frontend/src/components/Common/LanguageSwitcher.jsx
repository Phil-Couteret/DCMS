import React from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useTranslation } from '../../utils/languageContext';

const languages = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' }
];

const LanguageSwitcher = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        sx={{ color: 'white' }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            {lang.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;

