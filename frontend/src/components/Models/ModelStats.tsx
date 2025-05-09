import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  Timer as TimerIcon,
  Error as ErrorIcon,
  Token as TokenIcon,
} from '@mui/icons-material';
import { modelService } from '../../services/modelService';
import { ModelStats as ModelStatsType } from '../../types/models';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string, 
  value: string | number, 
  icon: React.ReactNode, 
  color: string 
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ 
          mr: 1.5, 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}22`, 
          color: color,
          borderRadius: '50%',
          p: 1,
          width: 40,
          height: 40
        }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={600}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const ModelStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [modelStats, setModelStats] = useState<Record<string, ModelStatsType>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await modelService.getModelStats();
        setModelStats(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching model stats:', err);
        setError('Failed to load model statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatTime = (ms: number): string => {
    return (ms / 1000).toFixed(2) + 's';
  };

  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(2) + '%';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" fontWeight={600} sx={{ mb: 3 }}>
        Model Performance
      </Typography>

      {Object.entries(modelStats).map(([modelKey, stats], index) => (
        <Box key={modelKey} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {modelKey.charAt(0).toUpperCase() + modelKey.slice(1)}
            </Typography>
            <Chip 
              size="small" 
              label="Last 30 days" 
              variant="outlined" 
              sx={{ ml: 2 }} 
            />
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Requests"
                value={formatNumber(stats.requests_count)}
                icon={<BarChartIcon />}
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Avg. Latency"
                value={formatTime(stats.average_latency)}
                icon={<TimerIcon />}
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Error Rate"
                value={formatPercentage(stats.error_rate)}
                icon={<ErrorIcon />}
                color="#f44336"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Tokens"
                value={formatNumber(stats.total_tokens)}
                icon={<TokenIcon />}
                color="#ff9800"
              />
            </Grid>
          </Grid>

          {index < Object.entries(modelStats).length - 1 && (
            <Divider sx={{ my: 3 }} />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ModelStats; 