import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({ variant = 'default', className, ...props }) => (
  <div className={`card card-${variant} ${className}`} {...props} />
);
