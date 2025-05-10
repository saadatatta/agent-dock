import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  Snackbar,
  Tab,
  Tabs,
} from '@mui/material';
import { motion } from 'framer-motion';
import ModelsList from './Models/ModelsList';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage your application settings and preferences
          </Typography>
        </motion.div>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="LLM Models" />
          <Tab label="General Settings" disabled />
          <Tab label="API Keys" disabled />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <ModelsList />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            General settings coming soon
          </Typography>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            API key management coming soon
          </Typography>
        </Box>
      </TabPanel>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={success}
      />
    </Box>
  );
};

export default Settings; 