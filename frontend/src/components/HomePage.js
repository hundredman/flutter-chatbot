import React, { useState } from 'react';
import './HomePage.css';
import { HiCode, HiSparkles, HiChevronDown, HiChevronRight } from 'react-icons/hi';
import LanguageToggle from './LanguageToggle';
import { curriculum } from '../data/curriculum';

const HomePage = ({ onStartConversation, user, onSignOut, onTestConversations, onTestRetrieval, language = 'en', onLanguageChange }) => {
  const [expandedPart, setExpandedPart] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);

  // Localized text
  const t = {
    en: {
      welcomeBack: 'Welcome back',
      signOut: 'Sign Out',
      title: 'Flutter AI Chatbot',
      subtitle: 'Your intelligent companion for Flutter development',
      startNewChat: 'Start New Chat',
      curriculumTitle: 'Flutter Learning Curriculum',
      curriculumSubtitle: '16 weeks • 6 parts • 138 questions',
      weeks: 'Weeks',
      chapters: 'chapters',
      questions: 'questions',
    },
    ko: {
      welcomeBack: '환영합니다',
      signOut: '로그아웃',
      title: 'Flutter AI 챗봇',
      subtitle: 'Flutter 개발을 위한 똑똑한 동반자',
      startNewChat: '새 채팅 시작',
      curriculumTitle: 'Flutter 학습 커리큘럼',
      curriculumSubtitle: '16주 • 6개 파트 • 138개 질문',
      weeks: '주차',
      chapters: '챕터',
      questions: '질문',
    }
  };

  const text = t[language] || t.en;

  const togglePart = (partId) => {
    setExpandedPart(expandedPart === partId ? null : partId);
    setExpandedChapter(null);
  };

  const toggleChapter = (chapterId, e) => {
    e.stopPropagation();
    setExpandedChapter(expandedChapter === chapterId ? null : chapterId);
  };

  const handleQuestionClick = (question, chapter, part) => {
    onStartConversation({
      week: `Part ${part.id}`,
      title: chapter.title[language] || chapter.title.en,
      initialPrompt: question[language] || question.en,
      prompt: question[language] || question.en
    });
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="user-bar">
          <div className="user-info">
            <span className="user-greeting">{text.welcomeBack}, {user?.name || 'User'}!</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <div className="user-actions">
            <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
            <button className="sign-out-btn" onClick={onSignOut}>
              {text.signOut}
            </button>
          </div>
        </div>

        <h1>
          <HiCode className="header-icon" />
          {text.title}
        </h1>
        <p>{text.subtitle}</p>

        <button
          className="new-chat-btn"
          onClick={() => onStartConversation({
            week: 'new',
            title: 'New Chat',
            initialPrompt: null // No premade prompt - blank chat
          })}
        >
          <HiSparkles />
          {text.startNewChat}
        </button>
      </header>

      <div className="curriculum-section">
        <h2>{text.curriculumTitle}</h2>
        <p className="curriculum-subtitle">{text.curriculumSubtitle}</p>

        <div className="curriculum-parts">
          {curriculum.parts.map((part) => (
            <div key={part.id} className="part-container">
              <div
                className={`part-header ${expandedPart === part.id ? 'expanded' : ''}`}
                style={{ borderLeftColor: part.color }}
                onClick={() => togglePart(part.id)}
              >
                <div className="part-header-content">
                  <div className="part-badge" style={{ backgroundColor: part.color }}>
                    Part {part.id}
                  </div>
                  <div className="part-info">
                    <h3>{part.title[language] || part.title.en}</h3>
                    <span className="part-meta">
                      {text.weeks} {part.weeks} • {part.chapters.length} {text.chapters}
                    </span>
                  </div>
                </div>
                <span className="expand-icon">
                  {expandedPart === part.id ? <HiChevronDown /> : <HiChevronRight />}
                </span>
              </div>

              {expandedPart === part.id && (
                <div className="chapters-list">
                  {part.chapters.map((chapter) => (
                    <div key={chapter.id} className="chapter-container">
                      <div
                        className={`chapter-header ${expandedChapter === chapter.id ? 'expanded' : ''}`}
                        onClick={(e) => toggleChapter(chapter.id, e)}
                      >
                        <div className="chapter-info">
                          <span className="chapter-number">Ch. {chapter.id}</span>
                          <span className="chapter-title">{chapter.title[language] || chapter.title.en}</span>
                        </div>
                        <div className="chapter-meta">
                          <span className="question-count">{chapter.questions.length} {text.questions}</span>
                          <span className="expand-icon">
                            {expandedChapter === chapter.id ? <HiChevronDown /> : <HiChevronRight />}
                          </span>
                        </div>
                      </div>

                      {expandedChapter === chapter.id && (
                        <div className="questions-list">
                          {chapter.questions.map((question) => (
                            <button
                              key={question.id}
                              className="question-btn"
                              onClick={() => handleQuestionClick(question, chapter, part)}
                            >
                              <span className="question-id">{question.id}</span>
                              <span className="question-text">{question[language] || question.en}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Debug tools - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ padding: '20px', borderTop: '1px solid #333', marginTop: '20px' }}>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>Debug Tools:</h3>
          <button
            onClick={onTestConversations}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Create Test Conversations
          </button>
          <button
            onClick={onTestRetrieval}
            style={{
              padding: '10px 20px',
              backgroundColor: '#764ba2',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Conversation Retrieval
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;