import React, { useState, useEffect } from 'react';
import './ChatLayout.css';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import HomePage from './HomePage';

const ChatLayout = ({ user, onSignOut }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentView, setCurrentView] = useState('home');

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem(`conversations_${user.id}`);
    if (savedConversations) {
      const parsed = JSON.parse(savedConversations);
      setConversations(parsed);
    }
  }, [user.id]);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(`conversations_${user.id}`, JSON.stringify(conversations));
    }
  }, [conversations, user.id]);

  const createNewChat = (initialData = null) => {
    const newConversation = {
      id: Date.now().toString(),
      title: initialData?.title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: user.id,
      week: initialData?.week,
      initialPrompt: initialData?.initialPrompt
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation);
    setCurrentView('chat');

    return newConversation;
  };

  const handleStartConversation = (weekData) => {
    const newConv = createNewChat({
      title: weekData.title,
      week: weekData.week,
      initialPrompt: weekData.initialPrompt
    });
    setCurrentConversation(newConv);
    setCurrentView('chat');
  };

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    setCurrentView('chat');
  };

  const handleUpdateConversation = (updatedConversation) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === updatedConversation.id
          ? { ...updatedConversation, updatedAt: Date.now() }
          : conv
      )
    );
    setCurrentConversation(updatedConversation);

    // Update title if it's still "New Chat" and we have messages
    if (
      updatedConversation.title === 'New Chat' &&
      updatedConversation.messages.length > 0
    ) {
      const firstUserMessage = updatedConversation.messages.find(m => m.type === 'user');
      if (firstUserMessage) {
        const newTitle = generateTitle(firstUserMessage.content);
        const conversationWithTitle = {
          ...updatedConversation,
          title: newTitle
        };

        setConversations(prev =>
          prev.map(conv =>
            conv.id === updatedConversation.id ? conversationWithTitle : conv
          )
        );
        setCurrentConversation(conversationWithTitle);
      }
    }
  };

  const handleDeleteConversation = (conversationId) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setCurrentView('home');
    }
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setCurrentConversation(null);
  };

  const generateTitle = (firstMessage) => {
    const words = firstMessage.split(' ').slice(0, 6);
    let title = words.join(' ');
    if (firstMessage.split(' ').length > 6) {
      title += '...';
    }
    return title;
  };

  return (
    <div className="chat-layout">
      <Sidebar
        user={user}
        onSignOut={onSignOut}
        onNewChat={() => createNewChat()}
        onSelectConversation={handleSelectConversation}
        currentConversationId={currentConversation?.id}
        conversations={conversations}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className="main-content">
        {currentView === 'home' ? (
          <div className="home-wrapper">
            <HomePage
              onStartConversation={handleStartConversation}
              user={user}
              onSignOut={onSignOut}
              isCompact={true} // Add compact mode for sidebar layout
            />
          </div>
        ) : (
          <ChatInterface
            conversation={currentConversation}
            onGoHome={handleGoHome}
            onUpdateConversation={handleUpdateConversation}
            user={user}
            showBackButton={false} // Remove back button since we have sidebar
          />
        )}
      </div>
    </div>
  );
};

export default ChatLayout;