import React from 'react';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  layout?: 'vertical' | 'horizontal' | 'inline';
}

export const Form: React.FC<FormProps> = ({ layout = 'vertical', ...props }) => (
  <form className={`form form-${layout}`} {...props} />
);

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, required, children }) => (
  <div className="form-field">
    {label && <label className={required ? 'required' : ''}>{label}</label>}
    {children}
    {error && <span className="error">{error}</span>}
  </div>
);
