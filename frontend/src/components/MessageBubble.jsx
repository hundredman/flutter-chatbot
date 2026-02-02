import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './MessageBubble.css';
import { HiUser, HiLightningBolt, HiRefresh, HiClipboardCopy, HiClipboardCheck } from 'react-icons/hi';

const MessageBubble = ({ message, language, onRegenerate }) => {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatTimestamp = (timestamp) => {
    let date;

    // Handle different timestamp formats
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      // Firestore timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp) {
      // String or number timestamp
      date = new Date(timestamp);
    } else {
      // Fallback to current time
      date = new Date();
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Now';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Custom components for ReactMarkdown
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';

      return !inline && language ? (
        <div style={{ position: 'relative' }}>
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
          <button
            className="copy-code-btn"
            onClick={() => {
              navigator.clipboard.writeText(String(children));
            }}
            title="Copy code"
          >
            📋
          </button>
        </div>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  if (message.type === 'user') {
    return (
      <div className="message-bubble user-message">
        <div className="message-content">
          <div className="message-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
          <div className="message-time">{formatTimestamp(message.timestamp)}</div>
        </div>
        <div className="message-avatar user-avatar">
          <HiUser />
        </div>
      </div>
    );
  }

  return (
    <div className="message-bubble bot-message">
      <div className="message-avatar bot-avatar">
        <HiLightningBolt />
      </div>
      <div className="message-content">
        <div className={`message-text ${message.error ? 'error-message' : ''}`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="sources-section">
            <div className="sources-header">
              <button
                className="sources-toggle"
                onClick={() => setShowSources(!showSources)}
              >
                <span className="sources-toggle-text">
                  {language === 'ko' ? `참고 문서 ${message.sources.length}개` : `${message.sources.length} Sources`}
                </span>
                <span className={`arrow ${showSources ? 'up' : 'down'}`}>›</span>
              </button>
              {message.confidence && (
                <span className={`confidence-badge ${
                  message.confidence > 0.6 ? 'high' : message.confidence > 0.4 ? 'medium' : 'low'
                }`}>
                  {Math.round(Math.min(50 + message.confidence * 60, 95))}%
                </span>
              )}
            </div>

            {showSources && (
              <div className="sources-list">
                {message.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-item"
                  >
                    <span className="source-title">{source.title || 'Flutter Documentation'}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="message-actions">
          <button
            className="copy-answer-btn"
            onClick={handleCopyAnswer}
            title={language === 'ko' ? '답변 복사' : 'Copy answer'}
          >
            {copied ? <HiClipboardCheck /> : <HiClipboardCopy />}
            {copied
              ? (language === 'ko' ? '복사됨!' : 'Copied!')
              : (language === 'ko' ? '복사' : 'Copy')
            }
          </button>

          {onRegenerate && (
            <button
              className="regenerate-btn"
              onClick={() => onRegenerate(message.id)}
              title={language === 'ko' ? '다시 생성' : 'Regenerate'}
            >
              <HiRefresh />
              {language === 'ko' ? '다시 생성' : 'Regenerate'}
            </button>
          )}
        </div>

        <div className="message-time">{formatTimestamp(message.timestamp)}</div>
      </div>
    </div>
  );
};

export default MessageBubble;