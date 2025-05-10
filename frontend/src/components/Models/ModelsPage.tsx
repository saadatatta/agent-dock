import React from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { motion } from 'framer-motion';
import ModelsList from './ModelsList';
import ModelStats from './ModelStats';

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
      id={`models-tabpanel-${index}`}
      aria-labelledby={`models-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 3 } }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ModelsPage: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ maxWidth: '100%', pb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            AI Models
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Manage and monitor your AI language models
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
          <Tab label="Available Models" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <ModelsList />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ModelStats />
      </TabPanel>
    </Box>
  );
};

export default ModelsPage; 