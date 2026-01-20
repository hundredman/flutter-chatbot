import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './HomePage.css';
import { HiCode, HiSparkles, HiChevronDown, HiChevronRight, HiLightningBolt, HiClock, HiTrendingUp, HiAcademicCap, HiRefresh } from 'react-icons/hi';
import LanguageToggle from './LanguageToggle';
import { curriculum } from '../data/curriculum';

const HomePage = ({ onStartConversation, user, onSignOut, onTestConversations, onTestRetrieval, language = 'en', onLanguageChange }) => {
  const [expandedPart, setExpandedPart] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [completedQuestions, setCompletedQuestions] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [dailyTipIndex, setDailyTipIndex] = useState(0);

  // Flutter tips data
  const flutterTips = useMemo(() => [
    { en: "Use 'const' constructors whenever possible to improve performance by allowing Flutter to cache widgets.", ko: "가능하면 'const' 생성자를 사용하세요. Flutter가 위젯을 캐시하여 성능이 향상됩니다." },
    { en: "The 'ListView.builder' is more efficient than 'ListView' for long lists as it only builds visible items.", ko: "'ListView.builder'는 보이는 항목만 빌드하므로 긴 목록에서 'ListView'보다 효율적입니다." },
    { en: "Use 'setState' sparingly - consider using Provider or Riverpod for complex state management.", ko: "'setState'를 아껴서 사용하세요 - 복잡한 상태 관리에는 Provider나 Riverpod를 고려하세요." },
    { en: "Hot reload (r) preserves state, while hot restart (R) resets the entire app state.", ko: "Hot reload(r)는 상태를 유지하고, hot restart(R)는 전체 앱 상태를 초기화합니다." },
    { en: "Use 'MediaQuery.of(context).size' to build responsive layouts that adapt to different screen sizes.", ko: "'MediaQuery.of(context).size'를 사용하여 다양한 화면 크기에 적응하는 반응형 레이아웃을 만드세요." },
    { en: "Wrap expensive widgets with 'RepaintBoundary' to isolate repaints and improve rendering performance.", ko: "비용이 큰 위젯을 'RepaintBoundary'로 감싸 리페인트를 격리하고 렌더링 성능을 향상시키세요." },
    { en: "Use 'FutureBuilder' and 'StreamBuilder' to handle asynchronous data in your UI elegantly.", ko: "'FutureBuilder'와 'StreamBuilder'를 사용하여 UI에서 비동기 데이터를 우아하게 처리하세요." },
  ], []);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flutter_progress');
    if (saved) {
      setCompletedQuestions(JSON.parse(saved));
    }
    const history = localStorage.getItem('flutter_recent_history');
    if (history) {
      setRecentHistory(JSON.parse(history));
    }
    // Set daily tip based on date
    const today = new Date().getDate();
    setDailyTipIndex(today % flutterTips.length);
  }, [flutterTips.length]);

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
      // New sections
      progressTitle: 'Your Progress',
      completed: 'completed',
      continuelearning: 'Continue Learning',
      recommendedTitle: "Today's Recommended Questions",
      refreshQuestions: 'Refresh',
      recentTitle: 'Recent Learning',
      noHistory: 'No learning history yet. Start with a question!',
      continueChat: 'Continue',
      tipsTitle: 'Flutter Tip of the Day',
      statsTitle: 'Learning Statistics',
      questionsLearned: 'Questions Learned',
      streakDays: 'Day Streak',
      thisWeek: 'This Week',
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
      // New sections
      progressTitle: '학습 진행률',
      completed: '완료',
      continuelearning: '이어서 학습하기',
      recommendedTitle: '오늘의 추천 질문',
      refreshQuestions: '새로고침',
      recentTitle: '최근 학습',
      noHistory: '아직 학습 기록이 없습니다. 질문으로 시작해보세요!',
      continueChat: '이어하기',
      tipsTitle: '오늘의 Flutter 팁',
      statsTitle: '학습 통계',
      questionsLearned: '학습한 질문',
      streakDays: '연속 학습',
      thisWeek: '이번 주',
    }
  };

  const text = t[language] || t.en;

  // Get all questions flattened
  const allQuestions = useMemo(() => {
    const questions = [];
    curriculum.parts.forEach(part => {
      part.chapters.forEach(chapter => {
        chapter.questions.forEach(q => {
          questions.push({ ...q, chapter, part });
        });
      });
    });
    return questions;
  }, []);

  // Get random recommended questions
  const [recommendedQuestions, setRecommendedQuestions] = useState([]);

  const refreshRecommendedQuestions = useCallback(() => {
    const uncompletedQuestions = allQuestions.filter(q => !completedQuestions.includes(q.id));
    const questionsToUse = uncompletedQuestions.length >= 4 ? uncompletedQuestions : allQuestions;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    setRecommendedQuestions(shuffled.slice(0, 4));
  }, [allQuestions, completedQuestions]);

  useEffect(() => {
    refreshRecommendedQuestions();
  }, [refreshRecommendedQuestions]);

  // Calculate progress stats
  const totalQuestions = 138;
  const completedCount = completedQuestions.length;
  const progressPercent = Math.round((completedCount / totalQuestions) * 100);

  // Calculate part progress
  const getPartProgress = (part) => {
    let total = 0;
    let completed = 0;
    part.chapters.forEach(chapter => {
      chapter.questions.forEach(q => {
        total++;
        if (completedQuestions.includes(q.id)) completed++;
      });
    });
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  // Mock streak calculation (would need backend for real implementation)
  const streakDays = Math.min(completedCount > 0 ? Math.floor(completedCount / 3) + 1 : 0, 30);
  const thisWeekCount = Math.min(completedCount, 15);

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

      {/* Progress Dashboard */}
      <div className="dashboard-grid">
        <div className="progress-card">
          <div className="progress-header">
            <HiAcademicCap className="section-icon" />
            <h3>{text.progressTitle}</h3>
          </div>
          <div className="progress-ring-container">
            <svg className="progress-ring" viewBox="0 0 100 100">
              <circle className="progress-ring-bg" cx="50" cy="50" r="40" />
              <circle
                className="progress-ring-fill"
                cx="50" cy="50" r="40"
                style={{ strokeDasharray: `${progressPercent * 2.51} 251` }}
              />
            </svg>
            <div className="progress-text">
              <span className="progress-percent">{progressPercent}%</span>
              <span className="progress-label">{completedCount}/{totalQuestions}</span>
            </div>
          </div>
          <div className="part-progress-list">
            {curriculum.parts.slice(0, 3).map(part => {
              const progress = getPartProgress(part);
              return (
                <div key={part.id} className="part-progress-item">
                  <span className="part-progress-name" style={{ color: part.color }}>
                    Part {part.id}
                  </span>
                  <div className="part-progress-bar">
                    <div
                      className="part-progress-fill"
                      style={{ width: `${progress.percent}%`, backgroundColor: part.color }}
                    />
                  </div>
                  <span className="part-progress-text">{progress.percent}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Statistics */}
        <div className="stats-card">
          <div className="stats-header">
            <HiTrendingUp className="section-icon" />
            <h3>{text.statsTitle}</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{completedCount}</span>
              <span className="stat-label">{text.questionsLearned}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{streakDays}</span>
              <span className="stat-label">{text.streakDays}</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{thisWeekCount}</span>
              <span className="stat-label">{text.thisWeek}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Recommended Questions */}
      <div className="recommended-section">
        <div className="section-header">
          <h2>
            <HiLightningBolt className="section-icon" />
            {text.recommendedTitle}
          </h2>
          <button className="refresh-btn" onClick={refreshRecommendedQuestions}>
            <HiRefresh />
            {text.refreshQuestions}
          </button>
        </div>
        <div className="recommended-grid">
          {recommendedQuestions.map((question) => (
            <button
              key={question.id}
              className="recommended-card"
              style={{ borderTopColor: question.part.color }}
              onClick={() => handleQuestionClick(question, question.chapter, question.part)}
            >
              <div className="recommended-meta">
                <span className="recommended-part" style={{ backgroundColor: question.part.color }}>
                  Part {question.part.id}
                </span>
                <span className="recommended-chapter">Ch. {question.chapter.id}</span>
              </div>
              <p className="recommended-text">{question[language] || question.en}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Flutter Tip of the Day */}
      <div className="tip-section">
        <div className="tip-card">
          <div className="tip-icon">💡</div>
          <div className="tip-content">
            <h3>{text.tipsTitle}</h3>
            <p>{flutterTips[dailyTipIndex][language] || flutterTips[dailyTipIndex].en}</p>
          </div>
        </div>
      </div>

      {/* Recent Learning History */}
      {recentHistory.length > 0 && (
        <div className="recent-section">
          <h2>
            <HiClock className="section-icon" />
            {text.recentTitle}
          </h2>
          <div className="recent-list">
            {recentHistory.slice(0, 3).map((item, index) => (
              <div key={index} className="recent-item">
                <div className="recent-info">
                  <span className="recent-question">{item.question}</span>
                  <span className="recent-time">{item.time}</span>
                </div>
                <button
                  className="recent-continue-btn"
                  onClick={() => onStartConversation({
                    week: item.part,
                    title: item.chapter,
                    initialPrompt: item.question
                  })}
                >
                  {text.continueChat}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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