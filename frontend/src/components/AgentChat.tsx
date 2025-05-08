import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
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
  Link
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AgentIcon,
  Person as UserIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';
import axios from 'axios';

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
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);

  // Add a system message on component mount
  React.useEffect(() => {
    const systemMessage: Message = {
      id: 'system-welcome',
      content: 'Welcome to Agent Chat! You can ask questions like "Show me my GitHub repositories" or "What tools are available?". Note that GROQ API integration must be properly configured for this to work fully.',
      sender: 'system',
      timestamp: new Date()
    };
    setMessages([systemMessage]);
  }, []);

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
        // Add error message
        const errorMsg = response.data.message || 'An error occurred processing your query';
        setError(errorMsg);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${errorMsg}`,
          sender: 'system',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      console.error('Error processing query:', err);
      let errorMsg = '';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMsg = `Server error: ${err.response.status} - ${err.response.data?.detail || JSON.stringify(err.response.data)}`;
        } else if (err.request) {
          // The request was made but no response was received
          errorMsg = 'No response from server. Please check if the backend is running.';
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMsg = `Error: ${err.message}`;
        }
      } else {
        errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      }
      
      setError(errorMsg);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${errorMsg}`,
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    // Keep only the welcome message
    setMessages(messages.filter(msg => msg.id === 'system-welcome'));
    setError(null);
  };

  const getMessageColor = (sender: string) => {
    switch(sender) {
      case 'user': return 'primary.light';
      case 'agent': return 'white';
      case 'system': return '#f5f5f5';
      default: return 'white';
    }
  };

  const getTextColor = (sender: string) => {
    switch(sender) {
      case 'user': return 'white';
      case 'agent': return 'text.primary';
      case 'system': return 'text.secondary';
      default: return 'text.primary';
    }
  };

  // Format message content with Markdown-like syntax
  const formatMessageContent = (content: string) => {
    if (!content) return '';
    
    // Very basic markdown-like formatting
    const formattedLines = content.split('\n').map((line, index) => {
      // Headings
      if (line.startsWith('# ')) {
        return <Typography key={index} variant="h5" sx={{ mt: 1, mb: 1 }}>{line.substring(2)}</Typography>;
      }
      if (line.startsWith('## ')) {
        return <Typography key={index} variant="h6" sx={{ mt: 1, mb: 0.5 }}>{line.substring(3)}</Typography>;
      }
      
      // List items
      if (line.startsWith('- ')) {
        return <Typography key={index} component="li" sx={{ ml: 2 }}>{line.substring(2)}</Typography>;
      }
      
      // Links (very simple approach)
      if (line.includes('http://') || line.includes('https://')) {
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        return (
          <Typography key={index} variant="body1" sx={{ mb: 0.5 }}>
            {parts.map((part, i) => {
              if (part.startsWith('http')) {
                return (
                  <Link key={i} href={part} target="_blank" rel="noopener noreferrer">
                    {part}
                  </Link>
                );
              }
              return part;
            })}
          </Typography>
        );
      }
      
      // Regular text
      return line ? <Typography key={index} variant="body1" sx={{ mb: 0.5 }}>{line}</Typography> : <br key={index} />;
    });
    
    return <>{formattedLines}</>;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Agent Chat</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ClearIcon />} 
          onClick={clearChat}
          disabled={messages.length <= 1}
        >
          Clear Chat
        </Button>
      </Box>

      <Collapse in={showAlert}>
        <Alert 
          severity="info" 
          onClose={() => setShowAlert(false)}
          sx={{ mb: 2 }}
        >
          This feature requires a valid GROQ API key for full functionality. However, basic GitHub queries will work without it.
          Try asking "Show my GitHub repositories" to test the GitHub integration.
        </Alert>
      </Collapse>

      {/* Chat messages area */}
      <Paper
        elevation={3}
        sx={{
          height: '60vh',
          p: 2,
          mb: 2,
          overflow: 'auto',
          bgcolor: '#f5f5f5'
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'text.secondary'
            }}
          >
            <AgentIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
            <Typography variant="body1">
              Start a conversation with the AI agents by typing a message below.
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              <Card
                sx={{
                  maxWidth: message.sender === 'system' ? '100%' : '80%',
                  width: message.sender === 'system' ? '100%' : 'auto',
                  bgcolor: getMessageColor(message.sender),
                  color: getTextColor(message.sender)
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor: message.sender === 'user' 
                          ? 'primary.dark' 
                          : message.sender === 'agent' 
                            ? (message.agentName?.includes('GitHub') ? '#333' : 'secondary.light')
                            : 'grey.400',
                        mr: 1
                      }}
                    >
                      {message.sender === 'user' 
                        ? <UserIcon /> 
                        : message.sender === 'agent'
                          ? (message.agentName?.includes('GitHub') ? <GitHubIcon /> : <AgentIcon />)
                          : <InfoIcon />
                      }
                    </Avatar>
                    <Typography variant="subtitle2">
                      {message.sender === 'user' 
                        ? 'You' 
                        : message.sender === 'agent'
                          ? (message.agentName || 'AI Assistant')
                          : 'System'
                      }
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    fontFamily: (message.content.includes('{') && message.content.includes('}')) || 
                               (message.content.includes('[') && message.content.includes(']'))
                      ? '"Roboto Mono", monospace' 
                      : 'inherit'
                  }}>
                    {message.content.includes('{') && message.content.includes('}') ? (
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                      </Typography>
                    ) : (
                      formatMessageContent(message.content)
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))
        )}
      </Paper>

      {/* Input area */}
      <Paper elevation={3} sx={{ p: 2 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask something (e.g., 'Show me my GitHub repositories')"
              value={query}
              onChange={handleQueryChange}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={loading || !query.trim()}
            >
              Send
            </Button>
          </Box>
        </form>
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Paper>

      {/* Example queries */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">Example queries:</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Chip 
            label="Show my GitHub repositories" 
            onClick={() => setQuery("Show my GitHub repositories")}
            icon={<GitHubIcon />}
          />
          <Chip 
            label="What tools are available?" 
            onClick={() => setQuery("What tools are available?")}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default AgentChat; 