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
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
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
  AutoAwesome as MagicIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Memory as MemoryIcon,
  MoreVert as MoreIcon,
  History as HistoryIcon,
  Save as SaveIcon
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
  modelInfo?: {
    provider: string;
    model: string;
  };
}

interface GitHubRepo {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  language: string;
}

// Interface for SpeechRecognition to avoid TypeScript errors
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

// Global SpeechRecognition constructor property
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// New interface for chat sessions
interface ChatSession {
  session_id: string;
  last_message: {
    content: string;
    sender: string;
    created_at: string;
  };
  timestamp: string;
}

const AgentChat: React.FC = () => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [activeLLM, setActiveLLM] = useState<{provider: string, model: string}>({
    provider: '',
    model: ''
  });
  // New state for chat sessions
  const [sessionId, setSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

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

  // Function to save a message to the backend
  const saveMessageToBackend = async (message: Message) => {
    try {
      // Skip saving system welcome message
      if (message.id === 'system-welcome') return;
      
      const metadata: any = {};
      
      if (message.agentId) metadata.agent_id = message.agentId;
      if (message.agentName) metadata.agent_name = message.agentName;
      if (message.modelInfo) metadata.model_info = message.modelInfo;
      
      await axios.post('http://localhost:8000/api/v1/chat/messages', {
        session_id: sessionId,
        content: message.content,
        sender: message.sender,
        message_type: 'text',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      });
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't show error to user, just log it
    }
  };

  // Load chat history when component mounts
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Load chat history from the backend
  const loadChatHistory = async (sid?: string) => {
    try {
      setLoadingHistory(true);
      
      const endpoint = sid 
        ? `http://localhost:8000/api/v1/chat/messages?session_id=${sid}`
        : 'http://localhost:8000/api/v1/chat/messages';
        
      const response = await axios.get(endpoint);
      
      if (response.data.status === 'success' && response.data.messages.length > 0) {
        // Convert backend messages to our Message format
        const historyMessages: Message[] = response.data.messages.map((msg: any) => ({
          id: `db-${msg.id}`,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.created_at),
          agentId: msg.metadata?.agent_id,
          agentName: msg.metadata?.agent_name,
          modelInfo: msg.metadata?.model_info
        }));
        
        setMessages(historyMessages);
        setSessionId(response.data.session_id);
      } else {
        // If no history, show welcome message
        const systemMessage: Message = {
          id: 'system-welcome',
          content: 'Welcome to Agent Chat! You can ask questions like "Show me my GitHub repositories" or You can also use the microphone button to speak your query.',
          sender: 'system',
          timestamp: new Date()
        };
        setMessages([systemMessage]);
        
        // Generate a new session ID if we don't have one
        if (!sessionId) {
          const newSessionResponse = await axios.post('http://localhost:8000/api/v1/chat/messages', {
            content: systemMessage.content,
            sender: systemMessage.sender,
            message_type: 'text'
          });
          setSessionId(newSessionResponse.data.session_id);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Show a welcome message anyway
      const systemMessage: Message = {
        id: 'system-welcome',
        content: 'Welcome to Agent Chat! You can ask questions like "Show me my GitHub repositories" or You can also use the microphone button to speak your query.',
        sender: 'system',
        timestamp: new Date()
      };
      setMessages([systemMessage]);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Load available chat sessions
  const loadChatSessions = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/chat/sessions');
      if (response.data.status === 'success') {
        setChatSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };
  
  // Handle opening the history menu
  const handleHistoryMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    loadChatSessions();
    setMenuAnchorEl(event.currentTarget);
  };
  
  // Handle closing the history menu
  const handleHistoryMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  // Handle selecting a chat session
  const handleSessionSelect = (sid: string) => {
    loadChatHistory(sid);
    handleHistoryMenuClose();
  };

  // Modified to initialize speech recognition
  useEffect(() => {
    // Speech recognition setup code - keep existing code
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        // Auto-submit after voice input
        setTimeout(() => {
          handleVoiceSubmit(transcript);
        }, 500);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      // Cleanup speech recognition - keep existing code
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Function to check if a query is a GitHub-related query
  const isGitHubQuery = (q: string): boolean => {
    const lowerQuery = q.toLowerCase();
    
    // Match simple "show my repositories" type queries
    const basicRepoPatterns = [
      /^(?:show|list|get)\s+(?:my|all)\s+(?:github\s+)?(?:repos|repositories)$/i,
      /^github\s+(?:repos|repositories)$/i,
      /^what\s+(?:repos|repositories)\s+do\s+i\s+have$/i
    ];
    
    // Match PR-related queries
    const prPatterns = [
      /(?:show|list|get)\s+(?:pull\s+requests|prs)\s+(?:in|for|from)\s+(\S+)(?:\s+repo|\s+repository)?/i,
      /(?:pull\s+requests|prs)\s+(?:in|for|from)\s+(\S+)(?:\s+repo|\s+repository)?/i
    ];
    
    // Check if it's a basic repo query
    const isBasicRepoQuery = basicRepoPatterns.some(pattern => pattern.test(lowerQuery));
    
    // Check if it's a PR query
    const isPrQuery = prPatterns.some(pattern => pattern.test(lowerQuery));
    
    return isBasicRepoQuery || isPrQuery;
  };
  
  // Function to extract repository name from query
  const extractRepositoryName = (q: string): string | null => {
    const lowerQuery = q.toLowerCase();
    
    // Look for patterns like "in repo X" or "in X repo" or just "X repo"
    const repoPatterns = [
      /(?:in|for|from)\s+(?:repo|repository)?\s*(\S+)(?:\s+repo|\s+repository)?/i,
      /(?:repo|repository)\s+(\S+)/i
    ];
    
    for (const pattern of repoPatterns) {
      const match = q.match(pattern);
      if (match && match[1]) {
        return match[1].replace(/[,.;:'"]/g, ''); // Clean up any punctuation
      }
    }
    
    return null;
  };

  // Enhanced function to handle GitHub specific queries directly
  const handleGitHubQuery = async (): Promise<{content: string, success: boolean}> => {
    try {
      // Test GitHub connection first
      const testResponse = await axios.post('http://localhost:8000/api/v1/tools/github/test');
      
      if (testResponse.data.status === 'success') {
        // Get the content from the last user message
        const lastUserMessageContent = messages.filter(m => m.sender === 'user').pop()?.content || '';
        const repoName = extractRepositoryName(lastUserMessageContent);
        
        // If this is a PR request for specific repo
        if (repoName && lastUserMessageContent.toLowerCase().includes('pull request')) {
          // Execute using the agent directly
          const response = await axios.post(`http://localhost:8000/api/v1/agents/3/execute`, {
            action: "list_pull_requests",
            parameters: {
              repo: repoName,
              state: "open"
            }
          });
          
          if (response.data.status === 'success') {
            const prs = response.data.data.pull_requests || [];
            
            // Format the PR information
            let prsContent = `# Pull Requests for ${repoName}\n\n`;
            
            if (prs.length === 0) {
              prsContent += "No open pull requests found.";
            } else {
              prs.forEach((pr: any) => {
                prsContent += `## PR #${pr.number}: ${pr.title}\n`;
                prsContent += `- State: ${pr.state}\n`;
                prsContent += `- Created by: ${pr.user.login}\n`;
                prsContent += `- URL: ${pr.url}\n\n`;
              });
            }
            
            return {
              content: prsContent,
              success: true
            };
          }
        } else {
          // Handle repositories listing (original implementation)
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

  const handleVoiceSubmit = (transcript: string) => {
    if (!transcript.trim()) return;

    // Create form event-like object for handleSubmit
    const fakeEvent = {
      preventDefault: () => {}
    } as React.FormEvent;
    
    // Set the query and trigger the submit
    setQuery(transcript);
    handleSubmit(fakeEvent);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Modified handleSubmit to save messages to the backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user message to the list
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: query,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);
    
    // Save user message to backend
    await saveMessageToBackend(userMessage);

    try {
      // Add a temporary agent message to indicate processing
      const tempAgentId = `agent-temp-${Date.now()}`;
      const tempAgentMessage: Message = {
        id: tempAgentId,
        content: "Thinking...",
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, tempAgentMessage]);

      // Use the Natural Language processing endpoint to handle the query
      const response = await axios.post('http://localhost:8000/api/v1/nl/query', {
        query: userMessage.content
      });

      // Replace the temporary message with the actual response
      const result = response.data;
      
      // Update the active LLM info if available
      if (result.model_info) {
        setActiveLLM({
          provider: result.model_info.provider,
          model: result.model_info.model
        });
      }
      
      let responseContent = '';
      
      if (result.status === 'success') {
        // First try to use human_readable content if available
        if (result.human_readable) {
          responseContent = result.human_readable;
        } else {
          // Extract agent information from the result
          const agentId = result.result?.agent_id || result.action_plan?.agent_id;
          const agentName = result.result?.agent_name || '';
          
          if (result.result?.status === 'success') {
            // Format successful response
            if (typeof result.result.result === 'object') {
              // For GitHib repository response - handle both "repos" and "repositories" keys for backward compatibility
              if (result.result.result.repos || result.result.result.repositories) {
                const repos = result.result.result.repos || result.result.result.repositories || [];
                responseContent = `# GitHub Repositories\n\n`;
                
                if (repos.length === 0) {
                  responseContent += "No repositories found.";
                } else {
                  repos.forEach((repo: any) => {
                    responseContent += `## [${repo.name}](${repo.html_url || repo.url})\n`;
                    responseContent += repo.description ? `${repo.description}\n` : '';
                    responseContent += `- Stars: ${repo.stargazers_count || repo.stars || 0}\n`;
                    responseContent += `- Forks: ${repo.forks_count || repo.forks || 0}\n`;
                    responseContent += `- Language: ${repo.language || 'Not specified'}\n\n`;
                  });
                }
              }
              // For other structured responses, try to make them human-readable
              else {
                // Try to extract readable information from the result
                responseContent = "";
                
                // Check if there's a message
                if (result.result.result.message) {
                  responseContent += result.result.result.message + "\n\n";
                }
                
                // Check if there's key information that should be displayed
                const importantKeys = ["name", "title", "description", "status", "count"];
                let hasImportantInfo = false;
                
                for (const key of importantKeys) {
                  if (result.result.result[key] !== undefined) {
                    responseContent += `**${key.charAt(0).toUpperCase() + key.slice(1)}**: ${result.result.result[key]}\n`;
                    hasImportantInfo = true;
                  }
                }
                
                // If no important info found, create a formatted JSON representation
                if (!hasImportantInfo) {
                  responseContent = `\`\`\`json\n${JSON.stringify(result.result.result, null, 2)}\n\`\`\``;
                }
              }
            } else {
              // For text responses
              responseContent = result.result.result;
            }
          } else {
            // Format error response
            responseContent = `Error: ${result.result?.error || 'Unknown error'}`;
            
            // Special handling for GitHub API 404 errors
            if (responseContent.includes("404") && responseContent.includes("https://api.github.com/repos/")) {
              responseContent += "\n\nThe repository was not found. Please make sure to use the format 'owner/repo' (e.g., 'microsoft/vscode' not just 'vscode').";
            }
            
            // If there are supported actions, include them
            if (result.result?.supported_actions) {
              responseContent += `\n\nSupported actions: ${result.result.supported_actions.join(", ")}`;
            }
          }
        }
      } else {
        // Handle error from the NL service
        responseContent = `Failed to process query: ${result.message || 'Unknown error'}`;
      }

      // Create the final agent message
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        content: responseContent,
        sender: 'agent',
        timestamp: new Date(),
        agentId: result.result?.agent_id || result.action_plan?.agent_id,
        agentName: result.result?.agent_name || 'Assistant',
        modelInfo: result.model_info
      };

      // Replace the temporary message with the final one
      setMessages(prev => prev.map(msg => 
        msg.id === tempAgentId ? agentMessage : msg
      ));
      
      // Save agent message to backend
      await saveMessageToBackend(agentMessage);
      
    } catch (error) {
      console.error('Error processing query:', error);
      setError('Failed to process your query. Please try again.');
      
      // Update the temporary message to show the error
      const errorMessage = {
        id: `agent-${Date.now()}`,
        content: 'Sorry, I encountered an error while processing your request.',
        sender: 'agent' as const,
        timestamp: new Date()
      };
      
      setMessages(prev => prev.map(msg => 
        msg.id.startsWith('agent-temp') ? errorMessage : msg
      ));
      
      // Save error message to backend
      await saveMessageToBackend(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Modified clearChat to delete session from backend
  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      // If we have a session ID, delete it from the backend
      if (sessionId) {
        try {
          await axios.delete(`http://localhost:8000/api/v1/chat/messages/${sessionId}`);
        } catch (error) {
          console.error('Error deleting chat session:', error);
        }
      }
      
      // Create a new system message
      const systemMessage: Message = {
        id: 'system-welcome',
        content: 'Chat history cleared. How can I assist you today?',
        sender: 'system',
        timestamp: new Date()
      };
      
      setMessages([systemMessage]);
      
      // Generate a new session ID
      try {
        const response = await axios.post('http://localhost:8000/api/v1/chat/messages', {
          content: systemMessage.content,
          sender: systemMessage.sender,
          message_type: 'text'
        });
        setSessionId(response.data.session_id);
      } catch (error) {
        console.error('Error creating new session:', error);
      }
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
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {activeLLM.provider && (
            <Chip
              icon={<MemoryIcon fontSize="small" />}
              label={`${activeLLM.provider} / ${activeLLM.model.split('-')[0]}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ 
                bgcolor: 'rgba(255, 0, 255, 0.05)',
                border: '1px solid rgba(255, 0, 255, 0.2)',
              }}
            />
          )}
          
          {/* History Menu Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tooltip title="Chat History">
              <IconButton
                onClick={handleHistoryMenuOpen}
                size="small"
                sx={{
                  bgcolor: 'rgba(0, 153, 255, 0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 153, 255, 0.2)'
                  }
                }}
              >
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          </motion.div>
          
          {/* Chat Sessions Menu */}
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleHistoryMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                maxHeight: 300,
                width: 320,
                overflow: 'auto',
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }
            }}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
              Recent Conversations
            </Typography>
            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            {loadingHistory ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} color="primary" />
              </Box>
            ) : chatSessions.length > 0 ? (
              chatSessions.map((session) => (
                <MenuItem 
                  key={session.session_id} 
                  onClick={() => handleSessionSelect(session.session_id)}
                  sx={{ 
                    borderRadius: 1,
                    mx: 1,
                    my: 0.5,
                    '&:hover': { 
                      bgcolor: 'rgba(255, 255, 255, 0.05)' 
                    }
                  }}
                >
                  <ListItemIcon>
                    {session.last_message.sender === 'user' ? 
                      <UserIcon fontSize="small" /> : 
                      <AgentIcon fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography 
                        variant="body2" 
                        noWrap 
                        sx={{ maxWidth: 200 }}
                      >
                        {session.last_message.content}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(session.timestamp).toLocaleString()}
                      </Typography>
                    }
                  />
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No conversation history found
                </Typography>
              </MenuItem>
            )}
          </Menu>
          
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
                            justifyContent: 'space-between',
                            gap: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MagicIcon fontSize="small" sx={{ color: theme.palette.secondary.main }} />
                            <Typography variant="subtitle2" color="text.secondary">
                              {message.agentName}
                            </Typography>
                          </Box>
                          
                          {message.modelInfo && (
                            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                              via {message.modelInfo.provider}/{message.modelInfo.model.split('-')[0]}
                            </Typography>
                          )}
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
          placeholder={activeLLM.provider ? `Ask ${activeLLM.provider}...` : "Ask a question..."}
          value={query}
          onChange={handleQueryChange}
          variant="outlined"
          disabled={loading}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Tooltip title={isListening ? "Stop listening" : "Speak your query"}>
                      <IconButton
                        color={isListening ? "secondary" : "primary"}
                        onClick={toggleListening}
                        disabled={loading}
                        sx={{
                          bgcolor: isListening ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 255, 255, 0.1)',
                          '&:hover': {
                            bgcolor: isListening ? 'rgba(255, 0, 255, 0.2)' : 'rgba(0, 255, 255, 0.2)',
                          },
                          animation: isListening ? 'pulse 1.5s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': { opacity: 1 },
                            '50%': { opacity: 0.6 },
                            '100%': { opacity: 1 },
                          }
                        }}
                      >
                        {isListening ? <MicOffIcon /> : <MicIcon />}
                      </IconButton>
                    </Tooltip>
                  </motion.div>
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
                </Box>
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