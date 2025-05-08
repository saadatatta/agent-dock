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
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { agentApi } from '../services/api';
import { Agent, Tool } from '../types/api';

const AgentList: React.FC = () => {
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

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await agentApi.getAgents();
      const agentsWithTools = response.data.map(agent => ({
        ...agent,
        tools: agent.tools || []
      }));
      setAgents(agentsWithTools);
    } catch (error) {
      setError('Failed to fetch agents');
      console.error('Error fetching agents:', error);
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Agents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Agent
        </Button>
      </Box>

      <Grid container spacing={3}>
        {agents.map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {agent.name}
                  </Typography>
                  <Box>
                    <IconButton onClick={() => handleOpen(agent)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(agent.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {agent.description}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {agent.tools && agent.tools.length > 0 ? (
                    agent.tools.map((tool) => (
                      <Chip
                        key={tool.id}
                        label={tool.name}
                        size="small"
                        icon={<CodeIcon />}
                      />
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      No tools assigned
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAgent ? 'Edit Agent' : 'Add New Agent'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
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
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingAgent ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AgentList; 