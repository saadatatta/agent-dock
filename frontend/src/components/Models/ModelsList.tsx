import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Divider,
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { settingsApi } from '../../services/api';
import { LLMModel } from '../../types/models';

const ModelsList: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [activeModel, setActiveModel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.getLLMModels();
      console.log('Fetched models:', response);
      setModels(response.data);
      setActiveModel(response.active_model);
      setError(null);
    } catch (err) {
      console.error('Error fetching LLM models:', err);
      setError('Failed to load LLM models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleActivateModel = async (modelKey: string) => {
    if (!modelKey || modelKey === 'undefined' || modelKey === activeModel) return;
    
    console.log('Activating model with key:', modelKey);
    setLoading(true);
    try {
      const response = await settingsApi.setActiveLLMModel(modelKey);
      console.log('Activation response:', response);
      setModels(response.data);
      setActiveModel(response.active_model);
      setSuccess(`Successfully activated ${getModelDisplayName(modelKey)}`);
      setError(null);
    } catch (err) {
      console.error('Error setting active model:', err);
      setError('Failed to activate model. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(null);
  };

  const getModelDisplayName = (key: string): string => {
    const model = models.find(m => m.key === key);
    if (!model) return key;
    return `${model.provider} / ${model.model_name}`;
  };

  const getProviderColor = (provider: string): string => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '#10a37f';
      case 'groq':
        return '#7c3aed';
      case 'anthropic':
        return '#ee4c2c';
      default:
        return '#1976d2';
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h5" component="h2" fontWeight={600}>
          Available Models
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={fetchModels}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {models.map((model) => (
            <Grid item xs={12} md={6} lg={4} key={model.key}>
              <motion.div 
                whileHover={{ 
                  y: -5, 
                  transition: { duration: 0.2 } 
                }}
              >
                <Paper 
                  elevation={model.key === activeModel ? 8 : 2}
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    border: model.key === activeModel ? 
                      `2px solid ${getProviderColor(model.provider)}` : 
                      '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {model.key === activeModel && (
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: getProviderColor(model.provider),
                        color: 'white',
                        p: 0.5,
                        px: 1,
                        borderBottomLeftRadius: 8,
                        zIndex: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckIcon fontSize="small" sx={{ mr: 0.5 }} />
                        <Typography variant="caption" fontWeight="bold">
                          Active
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}>
                      <Box>
                        <Chip
                          label={model.provider}
                          size="small"
                          sx={{
                            mb: 1,
                            bgcolor: getProviderColor(model.provider),
                            color: 'white',
                            fontWeight: 'bold'
                          }}
                        />
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {model.model_name}
                        </Typography>
                      </Box>
                      
                      <Tooltip title="Model details">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Temperature: {model.parameters.temperature || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Max Tokens: {model.parameters.max_tokens || 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        icon={model.api_key_available ? <CheckIcon /> : undefined}
                        label={model.api_key_available ? "API Key Available" : "No API Key"}
                        color={model.api_key_available ? "success" : "error"}
                        variant="outlined"
                        size="small"
                      />
                      
                      <Button
                        variant={model.key === activeModel ? "contained" : "outlined"}
                        color="primary"
                        size="small"
                        disabled={model.key === activeModel || !model.api_key_available}
                        onClick={() => handleActivateModel(model.key)}
                        sx={{
                          minWidth: '100px',
                          bgcolor: model.key === activeModel ? 
                            getProviderColor(model.provider) : undefined
                        }}
                      >
                        {model.key === activeModel ? "Active" : "Activate"}
                      </Button>
                    </Box>

                    {!model.api_key_available && (
                      <Box mt={1}>
                        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                          Missing API key: <strong>{model.api_key_env_var}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Add this to your .env file to use this model.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={success}
      />
    </Box>
  );
};

export default ModelsList; 