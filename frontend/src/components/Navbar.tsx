import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, useTheme } from '@mui/material';
import { Menu as MenuIcon, Notifications, GitHub } from '@mui/icons-material';
import { motion } from 'framer-motion';
import LogoAnimation from './LogoAnimation';

interface NavbarProps {
  drawerWidth: number;
  handleDrawerToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ drawerWidth, handleDrawerToggle }) => {
  const theme = useTheme();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <LogoAnimation size="small" />
          </Box>
          
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <LogoAnimation text="AD" size="small" />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <IconButton 
              color="inherit" 
              sx={{ 
                mr: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <GitHub />
            </IconButton>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <IconButton 
              color="inherit" 
              sx={{ 
                mr: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Notifications />
            </IconButton>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36,
                background: 'linear-gradient(45deg, #00FFFF, #FF00FF)',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
              }}
            >
              AD
            </Avatar>
          </motion.div>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 