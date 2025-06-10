import React from 'react';
import './TypingIndicator.css';

const TypingIndicator = ({ isTyping, username }) => {
  if (!isTyping) {
    return null;
  }

  return (
    <div className="typing-indicator">
      <div className="typing-indicator-content">
        <span className="typing-username">{username}</span>
        <span className="typing-text">yazıyor</span>
        <span className="typing-dots">
          <span className="dot dot1"></span>
          <span className="dot dot2"></span>
          <span className="dot dot3"></span>
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator; 