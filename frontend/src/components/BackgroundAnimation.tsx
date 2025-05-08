import React, { useRef, useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { Box } from '@mui/material';

const Particle = ({ x, y, size, color, speed }: { 
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}) => {
  const [position, setPosition] = useState({ x, y });
  
  const springs = useSpring({
    from: { transform: `translate(${position.x}px, ${position.y}px)` },
    to: { transform: `translate(${position.x}px, ${position.y + 500}px)` },
    config: {
      duration: 20000 / speed,
    },
    loop: true,
    reset: true,
    onRest: () => {
      setPosition({ 
        x: Math.random() * window.innerWidth,
        y: -50
      });
    },
  });

  return (
    <animated.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        opacity: 0.5,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        ...springs,
      }}
    />
  );
};

interface BackgroundAnimationProps {
  particleCount?: number;
}

const BackgroundAnimation: React.FC<BackgroundAnimationProps> = ({ 
  particleCount = 30
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<React.ReactNode[]>([]);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Create particles on mount and when window resizes
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);

    // Generate particles
    const newParticles = Array.from({ length: particleCount }).map((_, i) => {
      const size = Math.random() * 4 + 1;
      const color = i % 2 === 0 ? '#00FFFF' : '#FF00FF';
      const x = Math.random() * dimensions.width;
      const y = Math.random() * dimensions.height - dimensions.height;
      const speed = Math.random() * 0.5 + 0.5;
      
      return (
        <Particle
          key={i}
          x={x}
          y={y}
          size={size}
          color={color}
          speed={speed}
        />
      );
    });

    setParticles(newParticles);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [dimensions.width, dimensions.height, particleCount]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {particles}
    </Box>
  );
};

export default BackgroundAnimation; 