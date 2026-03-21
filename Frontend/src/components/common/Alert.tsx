import React from 'react';

interface AlertProps {
  message?: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  onClose?: () => void;
}

const Alert: React.FC<AlertProps> = ({ message, type = 'error', onClose }) => {
  if (!message) return null;
  
  const styles = {
    error: 'bg-red-50 border-red-400 text-red-800',
    success: 'bg-green-50 border-green-400 text-green-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800'
  };
  
  return (
    <div className={`border-l-4 p-4 mb-4 ${styles[type]}`}>
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
