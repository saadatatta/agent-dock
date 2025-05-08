import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Avatar,
  Alert,
  Collapse,
  Link as MuiLink,
  useTheme,
  Paper,
  InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AgentIcon,
  Person as UserIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  Delete as DeleteIcon,
  AutoAwesome as MagicIcon
} from '@mui/icons-material';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  timestamp: Date;
  agentId?: number;
  agentName?: string;
}

interface GitHubRepo {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
}

const AgentChat: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const messageVariants = {
    hidden: { 
      opacity: 0, 
      y: 20
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 100
      }
    }
  };

  // Add a system message on component mount
  useEffect(() => {
    const systemMessage: Message = {
      id: 'system-welcome',
      content: 'Welcome to Agent Chat! You can ask questions like "Show me my GitHub repositories" or "What tools are available?". Note that GROQ API integration must be properly configured for this to work fully.',
      sender: 'system',
      timestamp: new Date()
    };
    setMessages([systemMessage]);
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Function to check if a query is GitHub related
  const isGitHubQuery = (q: string): boolean => {
    const lowerQuery = q.toLowerCase();
    return (
      lowerQuery.includes('github') || 
      lowerQuery.includes('repository') || 
      lowerQuery.includes('repositories') || 
      lowerQuery.includes('repo') || 
      lowerQuery.includes('repos')
    );
  };

  // Function to handle GitHub specific queries directly
  const handleGitHubQuery = async (): Promise<{content: string, success: boolean}> => {
    try {
      // Test GitHub connection
      const testResponse = await axios.post('http://localhost:8000/api/v1/tools/github/test');
      
      if (testResponse.data.status === 'success') {
        // Fetch repositories
        const reposResponse = await axios.post('http://localhost:8000/api/v1/tools/github/repos');
        
        if (reposResponse.data.status === 'success') {
          const repos: GitHubRepo[] = reposResponse.data.repos;
          
          // Format the repositories information
          let reposContent = `# GitHub Repositories\n\n`;
          
          if (repos.length === 0) {
            reposContent += "No repositories found.";
          } else {
            repos.forEach(repo => {
              reposContent += `## ${repo.name}\n`;
              if (repo.description) reposContent += `${repo.description}\n\n`;
              reposContent += `- URL: ${repo.url}\n`;
              reposContent += `- Stars: ${repo.stars}\n`;
              reposContent += `- Forks: ${repo.forks}\n`;
              if (repo.language) reposContent += `- Language: ${repo.language}\n`;
              reposContent += `\n`;
            });
          }
          
          return {
            content: reposContent,
            success: true
          };
        }
      }
      
      return {
        content: "I couldn't retrieve your GitHub repositories. Please check your GitHub token configuration.",
        success: false
      };
    } catch (err) {
      console.error('Error accessing GitHub API:', err);
      return {
        content: `Failed to access GitHub API: ${err instanceof Error ? err.message : 'Unknown error'}`,
        success: false
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: query,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and set loading
    setQuery('');
    setLoading(true);
    setError(null);

    try {
      // Check if it's a GitHub related query
      if (isGitHubQuery(userMessage.content)) {
        // First try direct GitHub handling
        const { content, success } = await handleGitHubQuery();
        
        // Add GitHub response
        const gitHubMessage: Message = {
          id: (Date.now() + 1).toString(),
          content,
          sender: success ? 'agent' : 'system',
          timestamp: new Date(),
          agentName: success ? 'GitHub Agent' : 'System'
        };
        
        setMessages(prev => [...prev, gitHubMessage]);
        
        if (success) {
          setLoading(false);
          return; // Exit early if GitHub handling succeeded
        }
        // If GitHub handling failed, continue with NL processing
      }

      // Send request to NL API
      const response = await axios.post('http://localhost:8000/api/v1/nl/query', {
        query: userMessage.content
      });

      if (response.data.status === 'success') {
        // Format the result
        let resultContent = '';
        try {
          if (typeof response.data.result === 'object') {
            resultContent = JSON.stringify(response.data.result, null, 2);
          } else {
            resultContent = String(response.data.result);
          }
        } catch (e) {
          resultContent = 'Received result but unable to format it: ' + String(response.data.result);
        }

        // Add agent response to chat
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: resultContent,
          sender: 'agent',
          timestamp: new Date(),
          agentId: response.data.action_plan?.agent_id,
          agentName: response.data.action_plan?.agent_name || 'AI Assistant'
        };
        setMessages(prev => [...prev, agentMessage]);
      } else {
        setError(response.data.message || 'Failed to process query');
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setError('Error processing query. Please try again.');
      
      // Add system error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your query. Please try again later.',
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      const systemMessage: Message = {
        id: 'system-welcome',
        content: 'Chat history cleared. How can I assist you today?',
        sender: 'system',
        timestamp: new Date()
      };
      setMessages([systemMessage]);
    }
  };

  const getMessageColor = (sender: string) => {
    switch (sender) {
      case 'user':
        return theme.palette.primary.main;
      case 'agent':
        return theme.palette.secondary.main;
      case 'system':
      default:
        return theme.palette.grey[600];
    }
  };

  const getTextColor = (sender: string) => {
    switch (sender) {
      case 'user':
        return theme.palette.primary.contrastText;
      case 'agent':
        return theme.palette.secondary.contrastText;
      case 'system':
      default:
        return theme.palette.text.primary;
    }
  };

  const formatMessageContent = (content: string) => {
    return (
      <Markdown
        components={{
          code(props) {
            const {children, className, ...rest} = props;
            const match = /language-(\w+)/.exec(className || '');
            
            if (!match) {
              return (
                <code 
                  className={className}
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.1)', 
                    padding: '0.2em 0.4em',
                    borderRadius: '3px',
                    fontFamily: '"Fira Code", monospace',
                    fontSize: '85%'
                  }}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <SyntaxHighlighter
                language={match[1]}
                style={atomDark}
                PreTag="div"
                customStyle={{
                  borderRadius: '8px',
                  marginTop: '1em',
                  marginBottom: '1em'
                }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          },
          h1(props) {
            return <Typography variant="h4" component="h1" gutterBottom>{props.children}</Typography>;
          },
          h2(props) {
            return <Typography variant="h5" component="h2" gutterBottom>{props.children}</Typography>;
          },
          h3(props) {
            return <Typography variant="h6" component="h3" gutterBottom>{props.children}</Typography>;
          },
          p(props) {
            return <Typography variant="body1" component="p" paragraph>{props.children}</Typography>;
          },
          a(props) {
            return <MuiLink color="secondary" href={props.href} target="_blank" rel="noopener">{props.children}</MuiLink>;
          },
          li(props) {
            return <Typography component="li" variant="body1">{props.children}</Typography>;
          },
          ul(props) {
            return <Box component="ul" sx={{ pl: 2 }}>{props.children}</Box>;
          },
          ol(props) {
            return <Box component="ol" sx={{ pl: 2 }}>{props.children}</Box>;
          }
        }}
      >
        {content}
      </Markdown>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
          Agent Chat
        </Typography>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearChat}
            size="small"
            sx={{ borderRadius: 2 }}
          >
            Clear
          </Button>
        </motion.div>
      </Box>
      
      <Collapse in={showAlert}>
        <Alert 
          severity="info"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setShowAlert(false)}
            >
              <ClearIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ 
            mb: 2, 
            borderRadius: 2,
            background: 'rgba(0, 255, 255, 0.05)', 
            border: '1px solid rgba(0, 255, 255, 0.1)',
            '& .MuiAlert-icon': {
              color: theme.palette.primary.main
            }
          }}
        >
          <Typography variant="body2">
            This chat connects to your backend services and AI models. Try asking about your agents, tools, or GitHub repositories.
          </Typography>
        </Alert>
      </Collapse>

      <Paper
        sx={{ 
          flex: 1, 
          p: 2, 
          maxHeight: 'calc(100vh - 240px)', 
          overflowY: 'auto',
          mb: 2,
          borderRadius: 3,
          boxShadow: 'none',
          background: 'rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          '&::-webkit-scrollbar': {
            width: '8px',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                layout
              >
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    mb: 2,
                    alignItems: 'flex-start'
                  }}
                >
                  <Avatar
                    sx={{ 
                      bgcolor: getMessageColor(message.sender),
                      mr: message.sender === 'user' ? 0 : 1,
                      ml: message.sender === 'user' ? 1 : 0,
                      width: 36,
                      height: 36,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '2px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {message.sender === 'user' ? (
                      <UserIcon fontSize="small" />
                    ) : message.sender === 'agent' ? (
                      <AgentIcon fontSize="small" />
                    ) : (
                      <InfoIcon fontSize="small" />
                    )}
                  </Avatar>
                  
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ 
                      maxWidth: '80%',
                      position: 'relative'
                    }}
                  >
                    <Card
                      sx={{ 
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: message.sender === 'user' 
                          ? 'rgba(0, 255, 255, 0.05)'
                          : message.sender === 'agent'
                            ? 'rgba(255, 0, 255, 0.05)'
                            : 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {message.agentName && (
                        <Box 
                          sx={{ 
                            px: 2, 
                            py: 1, 
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <MagicIcon fontSize="small" sx={{ color: theme.palette.secondary.main }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            {message.agentName}
                          </Typography>
                        </Box>
                      )}
                      
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ fontSize: '0.95rem' }}>
                          {formatMessageContent(message.content)}
                        </Box>
                        
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block', 
                            textAlign: 'right',
                            mt: 1,
                            opacity: 0.6
                          }}
                        >
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <Box sx={{ display: 'flex', p: 2, justifyContent: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CircularProgress size={30} color="secondary" />
              </motion.div>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </motion.div>
      </Paper>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 1,
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          background: 'rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <TextField
          fullWidth
          placeholder="Ask a question..."
          value={query}
          onChange={handleQueryChange}
          variant="outlined"
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <IconButton
                    color="primary"
                    type="submit"
                    disabled={loading || !query.trim()}
                    sx={{
                      bgcolor: 'rgba(0, 255, 255, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 255, 255, 0.2)',
                      }
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </motion.div>
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              bgcolor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }
          }}
        />
      </Paper>
    </Box>
  );
};

export default AgentChat; 