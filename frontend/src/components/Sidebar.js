import React, { useState, useEffect } from 'react';
import './Sidebar.css';

const Sidebar = ({
  user,
  onSignOut,
  onNewChat,
  onSelectConversation,
  currentConversationId,
  conversations,
  onDeleteConversation
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const truncateTitle = (title, maxLength = 30) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const groupConversationsByDate = (conversations) => {
    const groups = {};

    conversations.forEach(conv => {
      const dateKey = formatDate(conv.createdAt || conv.id);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(conv);
    });

    return groups;
  };

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="toggle-btn" onClick={toggleSidebar}>
          {isCollapsed ? '→' : '←'}
        </button>

        {!isCollapsed && (
          <>
            <button className="new-chat-btn" onClick={onNewChat}>
              <span className="icon">💬</span>
              New Chat
            </button>
          </>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="conversations-list">
            {Object.keys(groupedConversations).length === 0 ? (
              <div className="no-conversations">
                <p>No conversations yet</p>
                <p>Start a new chat to begin!</p>
              </div>
            ) : (
              Object.entries(groupedConversations).map(([dateGroup, convs]) => (
                <div key={dateGroup} className="conversation-group">
                  <div className="group-header">{dateGroup}</div>
                  {convs.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`conversation-item ${
                        currentConversationId === conversation.id ? 'active' : ''
                      }`}
                      onClick={() => onSelectConversation(conversation)}
                    >
                      <div className="conversation-content">
                        <div className="conversation-title">
                          {truncateTitle(conversation.title || 'New Chat')}
                        </div>
                        <div className="conversation-preview">
                          {conversation.messages && conversation.messages.length > 0
                            ? truncateTitle(conversation.messages[0].content, 40)
                            : 'No messages yet'}
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        title="Delete conversation"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>
            <button className="sign-out-btn" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;