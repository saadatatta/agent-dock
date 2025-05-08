import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Button } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AgentList from './components/AgentList';
import ToolList from './components/ToolList';
import AgentChat from './components/AgentChat';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BackgroundAnimation from './components/BackgroundAnimation';
import ToolLogsList from './components/ToolLogsList';

// Create a dark theme with futuristic colors
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00FFFF', // Cyan
    },
    secondary: {
      main: '#FF00FF', // Magenta
    },
    background: {
      default: '#111827',
      paper: '#1F2937',
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#D1D5DB',
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 20px 0 rgba(0,255,255,0.25)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(31, 41, 55, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(17, 24, 39, 0.8)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backdropFilter: 'blur(10px)',
          background: 'rgba(17, 24, 39, 0.8)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
});

// Animation variants for route transitions
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -20,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

// Animated route wrapper
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        style={{ width: '100%', height: '100%' }}
      >
        <Routes location={location}>
          <Route path="/" element={<AgentList />} />
          <Route path="/tools" element={<ToolList />} />
          <Route path="/logs" element={<ToolLogsList />} />
          <Route path="/chat" element={<AgentChat />} />
          <Route path="/dashboard" element={
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              p: 5
            }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
                  Dashboard
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                  This feature is coming soon
                </Typography>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="contained" 
                    color="primary" 
                    component={Link} 
                    to="/"
                    sx={{
                      background: 'linear-gradient(45deg, #00FFFF, #00CCFF)',
                      boxShadow: '0 4px 20px 0 rgba(0,255,255,0.25)',
                    }}
                  >
                    Back to Agents
                  </Button>
                </motion.div>
              </motion.div>
            </Box>
          } />
          <Route path="/settings" element={
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              textAlign: 'center',
              p: 5
            }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Typography variant="h3" component="h1" sx={{ mb: 2, fontWeight: 700 }}>
                  Settings
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                  This feature is coming soon
                </Typography>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    component={Link} 
                    to="/"
                    sx={{
                      background: 'linear-gradient(45deg, #FF00FF, #CC00FF)',
                      boxShadow: '0 4px 20px 0 rgba(255,0,255,0.25)',
                    }}
                  >
                    Back to Agents
                  </Button>
                </motion.div>
              </motion.div>
            </Box>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerWidth = 280;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Add CSS for custom fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    
    const codeFontLink = document.createElement('link');
    codeFontLink.rel = 'stylesheet';
    codeFontLink.href = 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap';
    document.head.appendChild(codeFontLink);
    
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(codeFontLink);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ 
          display: 'flex', 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #111827 0%, #0A0F1A 100%)',
          position: 'relative'
        }}>
          <BackgroundAnimation particleCount={50} />
          
          <Navbar drawerWidth={drawerWidth} handleDrawerToggle={handleDrawerToggle} />
          <Sidebar 
            drawerWidth={drawerWidth} 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle} 
          />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              overflow: 'hidden',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              mt: { xs: '64px', sm: '70px' },
              position: 'relative',
              zIndex: 1,
            }}
          >
            <AnimatedRoutes />
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

export default App; 