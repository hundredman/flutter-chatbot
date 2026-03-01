import React, { useState, useEffect } from 'react';
import './ChatLayout.css';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import HomePage from './HomePage';
import QuizMode from './QuizMode';
import {
  createConversation,
  getUserConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  generateConversationTitle
} from '../firebase/chatService';

const ChatLayout = ({ user, onSignOut, language, onLanguageChange }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [isConversationFull, setIsConversationFull] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // Load conversations from Firestore on mount
  useEffect(() => {
    const loadConversations = async () => {
      if (user?.id) {
        setLoading(true);
        const result = await getUserConversations(user.id);
        if (result.success) {
          setConversations(result.conversations);
        } else {
          console.error('Failed to load conversations:', result.error);
        }
        setLoading(false);
      }
    };

    loadConversations();
  }, [user?.id]);

  const createNewChat = async (initialData = null) => {
    if (!user?.id) return null;

    const title = initialData?.title || 'New Chat';
    const initialPrompt = initialData?.initialPrompt;

    const result = await createConversation(user.id, title, initialPrompt);
    if (result.success) {
      const newConversation = {
        ...result.conversation,
        week: initialData?.week,
        initialPrompt: initialData?.initialPrompt,
        chapterQuestions: initialData?.chapterQuestions || null,
        currentQuestionIndex: initialData?.currentQuestionIndex || 0,
        chapterId: initialData?.chapterId || null,
        partId: initialData?.partId || null
      };

      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setCurrentView('chat');

      return newConversation;
    } else {
      console.error('Failed to create conversation:', result.error);
      return null;
    }
  };

  const handleStartConversation = async (weekData) => {
    const newConv = await createNewChat({
      title: weekData.title,
      week: weekData.week,
      initialPrompt: weekData.initialPrompt,
      chapterQuestions: weekData.chapterQuestions,
      currentQuestionIndex: weekData.currentQuestionIndex,
      chapterId: weekData.chapterId,
      partId: weekData.partId
    });
    if (newConv) {
      setCurrentConversation(newConv);
      setCurrentView('chat');
    }
  };

  // Handle starting a new chapter from ChatInterface
  const handleStartNewChapter = async (chapterData) => {
    await handleStartConversation(chapterData);
  };

  const handleSelectConversation = async (conversation) => {
    setIsConversationFull(false);
    // Fetch latest messages from Firestore
    const result = await getConversation(conversation.id);
    if (result.success) {
      setCurrentConversation({ ...conversation, messages: result.conversation.messages });
    } else {
      setCurrentConversation(conversation);
    }
    setCurrentView('chat');
  };

  const handleUpdateConversation = async (updatedConversation) => {
    // Update in Firestore
    const result = await updateConversation(updatedConversation.id, {
      messages: updatedConversation.messages,
      title: updatedConversation.title
    });

    if (result.limitReached) {
      setIsConversationFull(true);
      return;
    }

    if (result.success) {
      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === updatedConversation.id
            ? { ...updatedConversation, updatedAt: new Date() }
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
          const newTitle = generateConversationTitle(firstUserMessage);
          const conversationWithTitle = {
            ...updatedConversation,
            title: newTitle
          };

          // Update title in Firestore
          await updateConversation(updatedConversation.id, { title: newTitle });

          setConversations(prev =>
            prev.map(conv =>
              conv.id === updatedConversation.id ? conversationWithTitle : conv
            )
          );
          setCurrentConversation(conversationWithTitle);
        }
      }
    } else {
      console.error('Failed to update conversation:', result.error);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    const result = await deleteConversation(conversationId);

    if (result.success) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setCurrentView('home');
      }
    } else {
      console.error('Failed to delete conversation:', result.error);
    }
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setCurrentConversation(null);
  };

  // Delete all conversations
  const handleDeleteAllConversations = async () => {
    for (const conv of conversations) {
      await deleteConversation(conv.id);
    }
    setConversations([]);
    setCurrentConversation(null);
    setCurrentView('home');
  };

  // Show loading while conversations are being fetched
  if (loading) {
    return (
      <div className="chat-layout">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

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
        onGoHome={handleGoHome}
      />

      <div className="main-content">
        {currentView === 'home' ? (
          <div className="home-wrapper">
            <HomePage
              onStartConversation={handleStartConversation}
              onStartQuiz={() => setShowQuiz(true)}
              user={user}
              onSignOut={onSignOut}
              isCompact={true} // Add compact mode for sidebar layout
              onDeleteAllConversations={handleDeleteAllConversations}
              language={language}
              onLanguageChange={onLanguageChange}
            />
          </div>
        ) : (
          <ChatInterface
            key={currentConversation?.id}
            conversation={currentConversation}
            onGoHome={handleGoHome}
            onUpdateConversation={handleUpdateConversation}
            onStartNewChapter={handleStartNewChapter}
            isConversationFull={isConversationFull}
            user={user}
            showBackButton={false} // Remove back button since we have sidebar
            language={language}
            onLanguageChange={onLanguageChange}
          />
        )}
      </div>

      {showQuiz && (
        <QuizMode
          onClose={() => setShowQuiz(false)}
          language={language}
        />
      )}
    </div>
  );
};

export default ChatLayout;