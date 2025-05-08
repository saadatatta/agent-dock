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
  Avatar
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
    api_endpoint: '',
    parameters: {},
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
        api_endpoint: tool.api_endpoint,
        parameters: tool.parameters,
        is_active: tool.is_active
      });
    } else {
      setEditingTool(null);
      setFormData({
        name: '',
        description: '',
        api_endpoint: '',
        parameters: {},
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
    } catch (error) {
      setError('Failed to save tool');
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
                            label="API Tool"
                            size="small"
                            sx={{ 
                              background: 'rgba(255, 0, 255, 0.1)',
                              borderRadius: '10px',
                              '&:hover': {
                                background: 'rgba(255, 0, 255, 0.2)',
                              }
                            }}
                          />
                          
                          <Tooltip title="View API Endpoint">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <IconButton
                                color="secondary"
                                size="small"
                                sx={{ 
                                  background: 'rgba(255, 0, 255, 0.1)',
                                  '&:hover': {
                                    background: 'rgba(255, 0, 255, 0.2)',
                                  }
                                }}
                              >
                                <LinkIcon fontSize="small" />
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
              label="API Endpoint"
              value={formData.api_endpoint}
              onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
              margin="normal"
              variant="outlined"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  background: 'rgba(0, 0, 0, 0.2)',
                  fontFamily: '"Fira Code", monospace',
                }
              }}
            />
            <TextField
              fullWidth
              label="Parameters (JSON)"
              value={JSON.stringify(formData.parameters, null, 2)}
              onChange={(e) => {
                try {
                  const parameters = JSON.parse(e.target.value);
                  setFormData({ ...formData, parameters });
                } catch (error) {
                  // Allow invalid JSON while editing
                }
              }}
              margin="normal"
              multiline
              rows={4}
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
              sx={{ 
                borderRadius: 2,
                px: 3,
                background: 'linear-gradient(45deg, #FF00FF, #CC00FF)',
                boxShadow: '0 4px 10px 0 rgba(255,0,255,0.25)',
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