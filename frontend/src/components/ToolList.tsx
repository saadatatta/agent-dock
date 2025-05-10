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
  Alert,
  Snackbar,
  useTheme,
  CircularProgress,
  Backdrop,
  Tooltip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Code as CodeIcon,
  Api as ApiIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toolApi } from '../services/api';
import { Tool } from '../types/api';

const TOOL_TYPES = ['github', 'slack', 'jira'];

const ToolList: React.FC = () => {
  const theme = useTheme();
  const [tools, setTools] = useState<Tool[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState<Omit<Tool, 'id'>>({
    name: '',
    description: '',
    type: '',
    config: {},
    is_active: true
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await toolApi.getTools();
      setTools(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch tools');
      console.error('Error fetching tools:', error);
      setLoading(false);
    }
  };

  const handleOpen = (tool?: Tool) => {
    if (tool) {
      setEditingTool(tool);
      setFormData({
        name: tool.name,
        description: tool.description,
        type: tool.type,
        config: tool.config,
        is_active: tool.is_active
      });
    } else {
      setEditingTool(null);
      setFormData({
        name: '',
        description: '',
        type: '',
        config: {},
        is_active: true
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTool(null);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name) {
      setError('Tool name is required');
      return;
    }
    
    if (!formData.type) {
      setError('Tool type is required');
      return;
    }

    try {
      if (editingTool) {
        await toolApi.updateTool(editingTool.id, formData);
        setSuccess('Tool updated successfully');
      } else {
        await toolApi.createTool(formData);
        setSuccess('Tool created successfully');
      }
      handleClose();
      fetchTools();
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const errorData = error.response.data;
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            setError(`Failed to save tool: ${errorData.detail}`);
          } else if (Array.isArray(errorData.detail)) {
            // Handle validation errors
            const validationErrors = errorData.detail.map((err: any) => 
              `${err.loc.join('.')} - ${err.msg}`
            ).join(', ');
            setError(`Validation error: ${validationErrors}`);
          } else {
            setError('Failed to save tool: Invalid request data');
          }
        } else {
          setError(`Failed to save tool: Server error (${error.response.status})`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError('Failed to save tool: No response from server');
      } else {
        // Something happened in setting up the request
        setError(`Failed to save tool: ${error.message}`);
      }
      console.error('Error saving tool:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this tool?')) {
      try {
        await toolApi.deleteTool(id);
        setSuccess('Tool deleted successfully');
        fetchTools();
      } catch (error) {
        setError('Failed to delete tool');
        console.error('Error deleting tool:', error);
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

  // Function to generate a gradient based on tool name
  const getToolGradient = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = hash % 360;
    const hue2 = (hue1 + 40) % 360;
    return `linear-gradient(45deg, hsl(${hue1}, 80%, 60%), hsl(${hue2}, 80%, 60%))`;
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
          Your Tools
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
              background: 'linear-gradient(45deg, #FF00FF, #CC00FF)',
              boxShadow: '0 4px 20px 0 rgba(255,0,255,0.25)',
            }}
          >
            Add Tool
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
        {tools.length === 0 && !loading ? (
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
              No tools found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Get started by creating your first tool
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Create Tool
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            <AnimatePresence>
              {tools.map((tool) => (
                <Grid item xs={12} md={6} lg={4} key={tool.id}>
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
                              background: getToolGradient(tool.name),
                              boxShadow: '0 4px 10px rgba(255, 0, 255, 0.3)',
                            }}
                          >
                            {tool.name.charAt(0).toUpperCase()}
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
                            {tool.name}
                          </Typography>
                          <Box>
                            <Tooltip title="Edit tool">
                              <motion.div
                                style={{ display: 'inline-block' }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <IconButton 
                                  onClick={() => handleOpen(tool)} 
                                  size="small"
                                  sx={{ 
                                    color: theme.palette.text.secondary,
                                    '&:hover': { color: theme.palette.secondary.main }
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </motion.div>
                            </Tooltip>
                            <Tooltip title="Delete tool">
                              <motion.div
                                style={{ display: 'inline-block' }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <IconButton 
                                  onClick={() => handleDelete(tool.id)} 
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
                          {tool.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Chip
                            icon={<ApiIcon />}
                            label={tool.type ? tool.type.charAt(0).toUpperCase() + tool.type.slice(1) : "Unknown"}
                            size="small"
                            sx={{ 
                              background: 'rgba(255, 0, 255, 0.1)',
                              borderRadius: '10px',
                              '&:hover': {
                                background: 'rgba(255, 0, 255, 0.2)',
                              }
                            }}
                          />
                          
                          <Chip
                            label={tool.is_active ? "Active" : "Inactive"}
                            size="small"
                            color={tool.is_active ? "success" : "default"}
                            sx={{ 
                              borderRadius: '10px',
                            }}
                          />
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
            {editingTool ? 'Edit Tool' : 'Add New Tool'}
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
              required
              error={!formData.name && formData.name !== undefined}
              helperText={!formData.name && formData.name !== undefined ? "Name is required" : ""}
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
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                }
              }}
            />
            <FormControl fullWidth margin="normal" variant="outlined">
              <InputLabel id="tool-type-label">Type</InputLabel>
              <Select
                labelId="tool-type-label"
                id="tool-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Type"
                sx={{ borderRadius: 2, background: 'rgba(0, 0, 0, 0.2)' }}
                required
              >
                <MenuItem value="" disabled>
                  <em>Select a tool type</em>
                </MenuItem>
                {TOOL_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Tool type is required. Supported types: github, slack, jira.
              </FormHelperText>
            </FormControl>
            <TextField
              fullWidth
              label="Config (JSON)"
              value={JSON.stringify(formData.config, null, 2)}
              onChange={(e) => {
                try {
                  const config = JSON.parse(e.target.value);
                  setFormData({ ...formData, config });
                  // Clear any previous JSON error
                  if (error && error.includes('JSON')) {
                    setError(null);
                  }
                } catch (err) {
                  // Allow invalid JSON while editing, but don't update the state
                  if (e.target.value.trim() && e.target.value !== '{}') {
                    setError('Invalid JSON format. Please correct before submitting.');
                  } else if (e.target.value.trim() === '') {
                    setFormData({ ...formData, config: {} });
                    if (error && error.includes('JSON')) {
                      setError(null);
                    }
                  }
                }
              }}
              margin="normal"
              variant="outlined"
              multiline
              rows={4}
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                  fontFamily: '"Fira Code", monospace'
                }
              }}
              helperText={
                <React.Fragment>
                  {formData.type === 'slack' ? 
                    'Example: {"workspace": "your-workspace", "channel": "general"}' :
                  formData.type === 'github' ?
                    'Example: {"owner": "username", "repo": "repository-name"}' :
                  formData.type === 'jira' ?
                    'Example: {"instance": "your-instance.atlassian.net", "project": "PROJECT"}' :
                    'Enter configuration as JSON object'}
                </React.Fragment>
              }
              error={error !== null && error.includes('JSON')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleClose}
              variant="outlined"
              color="secondary"
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
              color="secondary"
              disabled={!formData.name || !formData.type}
              sx={{ 
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(45deg, #FF00FF, #CC00FF)',
                boxShadow: '0 4px 20px 0 rgba(255,0,255,0.25)',
                '&.Mui-disabled': {
                  background: 'rgba(255, 0, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)'
                }
              }}
            >
              {editingTool ? 'Update' : 'Create'}
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

export default ToolList; 