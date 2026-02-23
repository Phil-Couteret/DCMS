import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Navigation = () => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.pricing'), path: '/pricing' },
    { label: t('nav.contact'), path: '/contact' }
  ];

  const handleNav = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  const drawer = (
    <Box onClick={() => setMobileOpen(false)} sx={{ textAlign: 'center' }}>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.label} onClick={() => handleNav(item.path)}>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 0, mr: 4, cursor: 'pointer', fontWeight: 700 }}
            onClick={() => navigate('/')}
          >
            DCMS
          </Typography>

          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.label}
                  color="inherit"
                  onClick={() => handleNav(item.path)}
                  sx={{
                    textTransform: 'none',
                    borderBottom: location.pathname === item.path.split('#')[0] ? '2px solid white' : 'none'
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <LanguageSwitcher />
            {isMobile && (
              <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)}>
                <MenuIcon />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}>
        {drawer}
      </Drawer>
    </>
  );
};

export default Navigation;
