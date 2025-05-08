import React from 'react';
import { Box, Drawer, Toolbar, List, ListItem, ListItemIcon, ListItemText, useTheme, Divider } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { 
  SmartToy as SmartToyIcon, 
  Build as BuildIcon, 
  Chat as ChatIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import LogoAnimation from './LogoAnimation';

interface SidebarProps {
  drawerWidth: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ drawerWidth, mobileOpen, handleDrawerToggle }) => {
  const theme = useTheme();
  const location = useLocation();
  
  const menuItems = [
    { text: 'Agents', icon: <SmartToyIcon />, path: '/' },
    { text: 'Tools', icon: <BuildIcon />, path: '/tools' },
    { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
  ];
  
  const secondaryMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  // Animation for list items
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  const drawerContent = (
    <>
      <Toolbar 
        sx={{ 
          minHeight: { xs: '64px', sm: '70px' },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: 0,
          paddingRight: 0
        }}
      >
        <Box sx={{ mt: 1 }}>
          <LogoAnimation size="small" />
        </Box>
      </Toolbar>
      
      <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 'calc(100% - 70px)' }}>
        <Box>
          <List>
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              
              return (
                <motion.div
                  key={item.text}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, x: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ListItem
                    button
                    component={Link}
                    to={item.path}
                    onClick={handleDrawerToggle}
                    sx={{
                      my: 1,
                      mx: 1.5,
                      borderRadius: 2,
                      background: isActive 
                        ? `rgba(${isActive && item.path === '/' ? '0, 255, 255' : item.path === '/tools' ? '255, 0, 255' : '0, 255, 255'}, 0.1)`
                        : 'transparent',
                      '&:hover': {
                        background: isActive 
                          ? `rgba(${isActive && item.path === '/' ? '0, 255, 255' : item.path === '/tools' ? '255, 0, 255' : '0, 255, 255'}, 0.15)`
                          : 'rgba(255, 255, 255, 0.05)',
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive 
                          ? item.path === '/' ? theme.palette.primary.main 
                          : item.path === '/tools' ? theme.palette.secondary.main 
                          : theme.palette.primary.main
                          : theme.palette.text.secondary,
                        minWidth: 40
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      sx={{ 
                        color: isActive 
                          ? item.path === '/' ? theme.palette.primary.main 
                          : item.path === '/tools' ? theme.palette.secondary.main 
                          : theme.palette.primary.main
                          : theme.palette.text.primary,
                        '& .MuiTypography-root': {
                          fontWeight: isActive ? 600 : 400,
                        }
                      }} 
                    />
                    {isActive && (
                      <Box
                        component={motion.div}
                        layoutId="activeIndicator"
                        sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 4,
                          background: item.path === '/' 
                            ? 'linear-gradient(180deg, #00FFFF, #00CCFF)'
                            : item.path === '/tools'
                              ? 'linear-gradient(180deg, #FF00FF, #CC00FF)'
                              : 'linear-gradient(180deg, #00FFFF, #00CCFF)',
                          mr: -1,
                          boxShadow: item.path === '/' 
                            ? '0 0 10px rgba(0, 255, 255, 0.5)'
                            : item.path === '/tools'
                              ? '0 0 10px rgba(255, 0, 255, 0.5)'
                              : '0 0 10px rgba(0, 255, 255, 0.5)',
                        }}
                      />
                    )}
                  </ListItem>
                </motion.div>
              );
            })}
          </List>
          
          <Divider sx={{ my: 2, opacity: 0.1 }} />
          
          <List>
            {secondaryMenuItems.map((item, index) => (
              <motion.div
                key={item.text}
                custom={index + menuItems.length}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ListItem
                  button
                  component={Link}
                  to={item.path}
                  onClick={handleDrawerToggle}
                  sx={{
                    my: 1,
                    mx: 1.5,
                    borderRadius: 2,
                    opacity: 0.7,
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      opacity: 1
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: theme.palette.text.secondary, minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              </motion.div>
            ))}
          </List>
        </Box>
        
        <Box 
          sx={{ 
            p: 2, 
            textAlign: 'center', 
            opacity: 0.5, 
            fontSize: '0.75rem',
            background: 'rgba(0, 0, 0, 0.1)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(5px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            AgentDock v0.1.0 • 2023
          </motion.div>
        </Box>
      </Box>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 