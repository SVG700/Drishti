import React from 'react';
import { SpatialPage } from './SpatialPage';

interface MotionPageProps {
  children: React.ReactNode;
  className?: string;
}

export const MotionPage: React.FC<MotionPageProps> = ({ children, className }) => {
  return <SpatialPage className={className}>{children}</SpatialPage>;
};
