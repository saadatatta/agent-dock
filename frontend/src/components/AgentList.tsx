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
  PlayArrow as PlayArrowIcon,
  BugReport as PullRequestIcon,
  Storage as RepositoryIcon
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

  // Helper function to determine the icon for an agent
  const getAgentIcon = (agent: Agent) => {
    // Check if agent name or description includes GitHub
    if (agent.name.toLowerCase().includes('github') || 
        (agent.description && agent.description.toLowerCase().includes('github'))) {
      return <GitHubIcon sx={{ fontSize: 40 }} />;
    }
    
    // Check if the agent has GitHub tools
    const hasGitHubTool = agent.tools.some(tool => tool.type === 'github');
    if (hasGitHubTool) {
      return <GitHubIcon sx={{ fontSize: 40 }} />;
    }
    
    // Default icon for other agents
    return <CodeIcon sx={{ fontSize: 40 }} />;
  };
  
  // Helper function to get GitHub specific actions for GitHub agents
  const getGitHubActions = (agent: Agent) => {
    // Only show these actions for GitHub agents
    if (agent.name.toLowerCase().includes('github') || 
        (agent.description && agent.description.toLowerCase().includes('github')) ||
        agent.tools.some(tool => tool.type === 'github')) {
      return (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Tooltip title="List Repositories">
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => handleExecuteAction(agent.id, "get_repositories", {})}
            >
              <RepositoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="List Pull Requests">
            <IconButton 
              size="small" 
              color="secondary"
              onClick={() => {
                // Show a dialog to get the repository name
                const repo = prompt("Enter repository name (e.g., owner/repo):");
                if (repo) {
                  handleExecuteAction(agent.id, "list_pull_requests", { repo });
                }
              }}
            >
              <PullRequestIcon />
            </IconButton>
          </Tooltip>
        </Box>
      );
    }
    return null;
  };
  
  // Function to execute agent actions
  const handleExecuteAction = async (agentId: number, action: string, parameters: any) => {
    try {
      setLoading(true);
      const response = await agentApi.executeAgent(agentId, { action, parameters });
      // Handle the response (could show in a modal or alert)
      console.log("Agent execution result:", response);
      setSuccess(`Successfully executed ${action}`);
      setLoading(false);
      // TODO: Display results in a modal or other UI component
    } catch (error) {
      setError(`Failed to execute agent action: ${action}`);
      console.error('Error executing agent action:', error);
      setLoading(false);
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
                <Grid item xs={12} sm={6} md={4} key={agent.id} component={motion.div} variants={itemVariants}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'visible',
                      background: 'rgba(30, 30, 30, 0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -20,
                        left: 20,
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        backgroundColor: 'background.paper',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        border: '3px solid',
                        borderColor: agent.is_active ? 'success.main' : 'grey.500',
                        overflow: 'hidden',
                        zIndex: 1,
                      }}
                    >
                      {getAgentIcon(agent)}
                    </Box>
                    
                    <CardContent sx={{ p: 3, pt: 5, flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
                          {agent.name}
                        </Typography>
                        
                        <Box>
                          <IconButton 
                            onClick={() => handleOpen(agent)} 
                            size="small" 
                            sx={{ color: 'grey.400' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDelete(agent.id)} 
                            size="small" 
                            sx={{ color: 'grey.400' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 2, minHeight: 40, color: 'grey.400' }}
                      >
                        {agent.description || 'No description provided'}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        {agent.tools.map(tool => (
                          <Chip 
                            key={tool.id} 
                            label={tool.name}
                            size="small"
                            icon={tool.type === 'github' ? <GitHubIcon /> : <CodeIcon />}
                            sx={{ 
                              bgcolor: 'rgba(255, 255, 255, 0.1)', 
                              color: 'grey.300',
                              borderRadius: 1
                            }} 
                          />
                        ))}
                      </Stack>
                      
                      {getGitHubActions(agent)}
                    </CardContent>
                  </Card>
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