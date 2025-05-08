import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Alert,
  Snackbar,
  useTheme,
  CircularProgress,
  Backdrop,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  GitHub as GitHubIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { agentApi } from '../services/api';
import { Agent, Tool } from '../types/api';

const AgentList: React.FC = () => {
  const theme = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [open, setOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<Omit<Agent, 'id'>>({
    name: '',
    description: '',
    code: '',
    config: {},
    is_active: true,
    tools: []
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await agentApi.getAgents();
      const agentsWithTools = response.data.map(agent => ({
        ...agent,
        tools: agent.tools || []
      }));
      setAgents(agentsWithTools);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch agents');
      console.error('Error fetching agents:', error);
      setLoading(false);
    }
  };

  const handleOpen = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description,
        code: agent.code,
        config: agent.config,
        is_active: agent.is_active,
        tools: agent.tools
      });
    } else {
      setEditingAgent(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        config: {},
        is_active: true,
        tools: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingAgent(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingAgent) {
        await agentApi.updateAgent(editingAgent.id, formData);
        setSuccess('Agent updated successfully');
      } else {
        await agentApi.createAgent(formData);
        setSuccess('Agent created successfully');
      }
      handleClose();
      fetchAgents();
    } catch (error) {
      setError('Failed to save agent');
      console.error('Error saving agent:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await agentApi.deleteAgent(id);
        setSuccess('Agent deleted successfully');
        fetchAgents();
      } catch (error) {
        setError('Failed to delete agent');
        console.error('Error deleting agent:', error);
      }
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="primary" />
      </Backdrop>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          component={motion.h1}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(90deg, #fff, #ccc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Your Agents
        </Typography>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ 
              px: 3,
              py: 1,
              borderRadius: 3,
              background: 'linear-gradient(45deg, #00FFFF, #00CCFF)',
              boxShadow: '0 4px 20px 0 rgba(0,255,255,0.25)',
            }}
          >
            Add Agent
          </Button>
        </motion.div>
      </Box>

      <Box
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        sx={{ position: 'relative' }}
      >
        {agents.length === 0 && !loading ? (
          <Box 
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            sx={{ 
              textAlign: 'center', 
              p: 5, 
              borderRadius: 4, 
              border: '1px dashed rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.1)',
              my: 4
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No agents found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Get started by creating your first agent
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Create Agent
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <AnimatePresence>
              {agents.map((agent) => (
                <Grid item xs={12} md={6} lg={4} key={agent.id}>
                  <motion.div
                    layout
                    variants={itemVariants}
                    whileHover={{ 
                      y: -5,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <Card
                      sx={{ 
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'visible',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -15,
                          left: 20,
                          zIndex: 10,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Avatar
                            sx={{
                              width: 48,
                              height: 48,
                              border: '3px solid rgba(255, 255, 255, 0.1)',
                              background: 'linear-gradient(45deg, #00FFFF, #00CCFF)',
                              boxShadow: '0 4px 10px rgba(0, 255, 255, 0.3)',
                            }}
                          >
                            {agent.name.charAt(0).toUpperCase()}
                          </Avatar>
                        </motion.div>
                      </Box>
                      
                      <CardContent sx={{ pt: 3, pb: 2, flex: 1 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          mt: 2
                        }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, ml: 5 }}>
                            {agent.name}
                          </Typography>
                          <Box>
                            <Tooltip title="Edit agent">
                              <motion.div
                                style={{ display: 'inline-block' }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <IconButton 
                                  onClick={() => handleOpen(agent)} 
                                  size="small"
                                  sx={{ 
                                    color: theme.palette.text.secondary,
                                    '&:hover': { color: theme.palette.primary.main }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </motion.div>
                            </Tooltip>
                            <Tooltip title="Delete agent">
                              <motion.div
                                style={{ display: 'inline-block' }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <IconButton 
                                  onClick={() => handleDelete(agent.id)} 
                                  size="small"
                                  sx={{ 
                                    color: theme.palette.text.secondary,
                                    '&:hover': { color: theme.palette.error.main }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </motion.div>
                            </Tooltip>
                          </Box>
                        </Box>
                        
                        <Typography 
                          color="text.secondary" 
                          sx={{ 
                            mb: 2, 
                            px: 1, 
                            fontSize: '0.875rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {agent.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                            {agent.tools && agent.tools.length > 0 ? (
                              agent.tools.slice(0, 3).map((tool) => (
                                <Chip
                                  key={tool.id}
                                  label={tool.name}
                                  size="small"
                                  icon={<CodeIcon />}
                                  sx={{ 
                                    background: 'rgba(0, 255, 255, 0.1)',
                                    borderRadius: '10px',
                                    '&:hover': {
                                      background: 'rgba(0, 255, 255, 0.2)',
                                    }
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No tools assigned
                              </Typography>
                            )}
                            {agent.tools && agent.tools.length > 3 && (
                              <Chip
                                label={`+${agent.tools.length - 3}`}
                                size="small"
                                sx={{ 
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  borderRadius: '10px'
                                }}
                              />
                            )}
                          </Stack>
                          
                          <Tooltip title="Run agent">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <IconButton
                                color="primary"
                                size="small"
                                sx={{ 
                                  background: 'rgba(0, 255, 255, 0.1)',
                                  '&:hover': {
                                    background: 'rgba(0, 255, 255, 0.2)',
                                  }
                                }}
                              >
                                <PlayArrowIcon fontSize="small" />
                              </IconButton>
                            </motion.div>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>
        )}
      </Box>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'rgba(31, 41, 55, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            {editingAgent ? 'Edit Agent' : 'Add New Agent'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            />
            <TextField
              fullWidth
              label="Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
              multiline
              rows={6}
              sx={{ fontFamily: 'monospace' }}
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                  fontFamily: '"Fira Code", monospace',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleClose}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                px: 3
              }}
            >
              Cancel
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              sx={{ 
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(45deg, #00FFFF, #00CCFF)',
                boxShadow: '0 4px 10px 0 rgba(0,255,255,0.25)',
              }}
            >
              {editingAgent ? 'Update' : 'Create'}
            </Button>
          </motion.div>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)}
          sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AgentList; 