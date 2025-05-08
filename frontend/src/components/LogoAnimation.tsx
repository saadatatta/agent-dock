import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, useTheme } from '@mui/material';

interface LogoAnimationProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const LogoAnimation: React.FC<LogoAnimationProps> = ({ 
  text = 'AgentDock', 
  size = 'medium',
  onClick
}) => {
  const theme = useTheme();
  const [animate, setAnimate] = useState(true);

  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: '1.5rem',
      letterSpacing: '0.05em',
      glowSize: '10px',
      gap: 2
    },
    medium: {
      fontSize: '2rem',
      letterSpacing: '0.07em',
      glowSize: '15px',
      gap: 3
    },
    large: {
      fontSize: '3rem',
      letterSpacing: '0.1em',
      glowSize: '20px',
      gap: 4
    }
  };

  const currentSize = sizeConfig[size];

  // Character animation variants
  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.07,
        duration: 0.5,
        ease: [0.2, 0.65, 0.3, 0.9]
      }
    }),
    hover: {
      y: -5,
      scale: 1.1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 15
      }
    }
  };

  // Restart animation periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (animate) {
      interval = setInterval(() => {
        setAnimate(false);
        setTimeout(() => setAnimate(true), 100);
      }, 15000); // Restart animation every 15 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [animate]);

  return (
    <Box
      component={motion.div}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      sx={{ 
        display: 'flex', 
        cursor: onClick ? 'pointer' : 'default',
        alignItems: 'center',
        gap: currentSize.gap
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {animate && text.split('').map((char, index) => (
          <motion.div
            key={`${char}-${index}`}
            custom={index}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            variants={letterVariants}
            style={{
              display: 'inline-block',
              fontSize: currentSize.fontSize,
              fontWeight: 700,
              letterSpacing: currentSize.letterSpacing,
              margin: '0 2px',
              position: 'relative',
              textShadow: `0 0 ${currentSize.glowSize} ${index % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main}`,
              color: index % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main
            }}
          >
            {char}
          </motion.div>
        ))}
      </Box>
    </Box>
  );
};

export default LogoAnimation; 