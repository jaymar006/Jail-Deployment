import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('entered');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exiting');
    }
  }, [location.pathname, displayLocation.pathname]);

  useEffect(() => {
    if (transitionStage === 'exiting') {
      // Very short exit time for smoother crossfade
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('entering');
      }, 80);
      return () => clearTimeout(timer);
    } else if (transitionStage === 'entering') {
      // Mark as entered after animation completes
      const timer = setTimeout(() => {
        setTransitionStage('entered');
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [transitionStage, location]);

  return (
    <div className={`page-transition page-transition-${transitionStage}`}>
      {children}
    </div>
  );
};

export default PageTransition;

