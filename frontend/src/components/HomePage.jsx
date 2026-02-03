import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './HomePage.css';
import { HiCode, HiSparkles, HiChevronDown, HiChevronRight, HiLightningBolt, HiClock, HiTrendingUp, HiAcademicCap, HiRefresh, HiPlay, HiArrowRight, HiCheckCircle, HiCog, HiX, HiExclamation, HiTrash } from 'react-icons/hi';
import LanguageToggle from './LanguageToggle';
import { curriculum } from '../data/curriculum';
import { getProgress, getStats, getOverallProgress, getPartProgress as getPartProgressFromService, findNextQuestion, isChapterCompleted } from '../services/learningProgress';

const HomePage = ({ onStartConversation, user, onSignOut, onTestConversations, onTestRetrieval, onDeleteAllConversations, language = 'en', onLanguageChange }) => {
  const [expandedPart, setExpandedPart] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [progress, setProgress] = useState(null);
  const [stats, setStats] = useState({ totalQuestionsLearned: 0, streakDays: 0, thisWeekCount: 0 });
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 138, percentage: 0 });
  const [recentHistory, setRecentHistory] = useState([]);
  const [dailyTipIndex, setDailyTipIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Flutter tips data - comprehensive list for daily rotation
  const flutterTips = useMemo(() => [
    // Performance tips
    { en: "Use 'const' constructors whenever possible to improve performance by allowing Flutter to cache widgets.", ko: "가능하면 'const' 생성자를 사용하세요. Flutter가 위젯을 캐시하여 성능이 향상됩니다." },
    { en: "The 'ListView.builder' is more efficient than 'ListView' for long lists as it only builds visible items.", ko: "'ListView.builder'는 보이는 항목만 빌드하므로 긴 목록에서 'ListView'보다 효율적입니다." },
    { en: "Wrap expensive widgets with 'RepaintBoundary' to isolate repaints and improve rendering performance.", ko: "비용이 큰 위젯을 'RepaintBoundary'로 감싸 리페인트를 격리하고 렌더링 성능을 향상시키세요." },
    { en: "Use 'const' widgets inside build() methods to prevent unnecessary rebuilds and improve performance.", ko: "build() 메서드 내에서 'const' 위젯을 사용하여 불필요한 리빌드를 방지하고 성능을 향상시키세요." },
    { en: "Avoid using Opacity widget for hiding widgets - use Visibility or conditional rendering instead for better performance.", ko: "위젯을 숨길 때 Opacity 위젯 사용을 피하세요 - 더 나은 성능을 위해 Visibility나 조건부 렌더링을 사용하세요." },
    // State management tips
    { en: "Use 'setState' sparingly - consider using Provider or Riverpod for complex state management.", ko: "'setState'를 아껴서 사용하세요 - 복잡한 상태 관리에는 Provider나 Riverpod를 고려하세요." },
    { en: "Keep your StatefulWidgets small and focused - extract logic to separate classes for better testability.", ko: "StatefulWidget을 작고 집중적으로 유지하세요 - 더 나은 테스트 가능성을 위해 로직을 별도 클래스로 추출하세요." },
    { en: "Use 'ValueNotifier' and 'ValueListenableBuilder' for simple reactive state without complex packages.", ko: "복잡한 패키지 없이 간단한 반응형 상태를 위해 'ValueNotifier'와 'ValueListenableBuilder'를 사용하세요." },
    // Development tips
    { en: "Hot reload (r) preserves state, while hot restart (R) resets the entire app state.", ko: "Hot reload(r)는 상태를 유지하고, hot restart(R)는 전체 앱 상태를 초기화합니다." },
    { en: "Use Flutter DevTools to profile your app's performance and identify rendering issues.", ko: "Flutter DevTools를 사용하여 앱의 성능을 프로파일링하고 렌더링 문제를 식별하세요." },
    { en: "Add 'debugPrint()' instead of 'print()' - it throttles output to avoid dropped messages in Android logs.", ko: "'print()' 대신 'debugPrint()'를 추가하세요 - Android 로그에서 메시지 누락을 방지하기 위해 출력을 조절합니다." },
    // Layout tips
    { en: "Use 'MediaQuery.of(context).size' to build responsive layouts that adapt to different screen sizes.", ko: "'MediaQuery.of(context).size'를 사용하여 다양한 화면 크기에 적응하는 반응형 레이아웃을 만드세요." },
    { en: "Use 'LayoutBuilder' to get parent constraints and build responsive widgets based on available space.", ko: "'LayoutBuilder'를 사용하여 부모 제약 조건을 얻고 사용 가능한 공간에 따라 반응형 위젯을 빌드하세요." },
    { en: "Prefer 'SizedBox' over 'Container' when you only need to add spacing or set dimensions.", ko: "간격 추가나 크기 설정만 필요할 때는 'Container' 대신 'SizedBox'를 사용하세요." },
    { en: "Use 'Expanded' and 'Flexible' inside Row/Column to control how children share available space.", ko: "Row/Column 내에서 'Expanded'와 'Flexible'을 사용하여 자식 위젯이 사용 가능한 공간을 공유하는 방식을 제어하세요." },
    // Async tips
    { en: "Use 'FutureBuilder' and 'StreamBuilder' to handle asynchronous data in your UI elegantly.", ko: "'FutureBuilder'와 'StreamBuilder'를 사용하여 UI에서 비동기 데이터를 우아하게 처리하세요." },
    { en: "Always handle loading, error, and data states when using FutureBuilder or StreamBuilder.", ko: "FutureBuilder나 StreamBuilder를 사용할 때 항상 로딩, 에러, 데이터 상태를 처리하세요." },
    { en: "Use 'async/await' with try-catch blocks for cleaner asynchronous code and better error handling.", ko: "더 깔끔한 비동기 코드와 더 나은 에러 처리를 위해 try-catch 블록과 함께 'async/await'를 사용하세요." },
    // Widget tips
    { en: "Extract repeated widget code into custom widgets - it improves readability and makes testing easier.", ko: "반복되는 위젯 코드를 커스텀 위젯으로 추출하세요 - 가독성이 향상되고 테스트가 쉬워집니다." },
    { en: "Use 'GestureDetector' or 'InkWell' to add touch interactions - InkWell provides Material ripple effect.", ko: "터치 상호작용을 추가하려면 'GestureDetector' 또는 'InkWell'을 사용하세요 - InkWell은 Material 리플 효과를 제공합니다." },
    { en: "Use 'SafeArea' widget to avoid system UI overlaps on devices with notches or rounded corners.", ko: "노치나 둥근 모서리가 있는 기기에서 시스템 UI 겹침을 방지하려면 'SafeArea' 위젯을 사용하세요." },
    // Navigation tips
    { en: "Use named routes for cleaner navigation code: Navigator.pushNamed(context, '/detail').", ko: "더 깔끔한 네비게이션 코드를 위해 명명된 라우트를 사용하세요: Navigator.pushNamed(context, '/detail')." },
    { en: "Consider using 'go_router' or 'auto_route' packages for complex navigation requirements.", ko: "복잡한 네비게이션 요구사항에는 'go_router' 또는 'auto_route' 패키지 사용을 고려하세요." },
    // Testing tips
    { en: "Write widget tests using 'testWidgets()' to verify your UI behaves correctly under different conditions.", ko: "'testWidgets()'를 사용하여 위젯 테스트를 작성하고 다양한 조건에서 UI가 올바르게 동작하는지 확인하세요." },
    { en: "Use 'flutter test --coverage' to generate code coverage reports for your test suite.", ko: "'flutter test --coverage'를 사용하여 테스트 스위트의 코드 커버리지 보고서를 생성하세요." },
    // Animation tips
    { en: "Use 'AnimatedContainer' for simple implicit animations - it automatically animates property changes.", ko: "간단한 암시적 애니메이션에는 'AnimatedContainer'를 사용하세요 - 속성 변경을 자동으로 애니메이션합니다." },
    { en: "Prefer implicit animations (AnimatedFoo widgets) over explicit animations when possible for simpler code.", ko: "가능하면 더 간단한 코드를 위해 명시적 애니메이션보다 암시적 애니메이션(AnimatedFoo 위젯)을 선호하세요." },
    // Dart tips
    { en: "Use null safety operators: ?. for null-aware access, ?? for default values, and ! for null assertion.", ko: "null 안전 연산자를 사용하세요: null 인식 접근에는 ?., 기본값에는 ??, null 단언에는 !를 사용합니다." },
    { en: "Use 'spread operator' (...) to combine lists easily: [...list1, ...list2, newItem].", ko: "'전개 연산자'(...)를 사용하여 리스트를 쉽게 결합하세요: [...list1, ...list2, newItem]." },
    { en: "Use 'collection if' and 'collection for' for cleaner list building: [if (condition) widget, for (item in items) Text(item)].", ko: "더 깔끔한 리스트 빌딩을 위해 'collection if'와 'collection for'를 사용하세요." },
  ], []);

  // Load progress from learningProgress service
  const loadProgress = useCallback(() => {
    const progressData = getProgress();
    setProgress(progressData);
    setStats(getStats());
    setOverallProgress(getOverallProgress(curriculum));
  }, []);

  // Refresh tip - select random tip
  const refreshTip = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * flutterTips.length);
    setDailyTipIndex(randomIndex);
  }, [flutterTips.length]);

  useEffect(() => {
    loadProgress();
    const history = localStorage.getItem('flutter_recent_history');
    if (history) {
      setRecentHistory(JSON.parse(history));
    }
    // Set random tip on page load/visit
    refreshTip();
  }, [loadProgress, refreshTip]);

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
      startChapter: 'Start Chapter',
      continueLearning: 'Continue Learning',
      // Settings
      settings: 'Settings',
      settingsTitle: 'Settings',
      resetProgress: 'Reset Learning Progress',
      resetProgressDesc: 'Clear all completed questions and start fresh',
      deleteAllChats: 'Delete All Chats',
      deleteAllChatsDesc: 'Remove all conversation history',
      confirmReset: 'Are you sure? This cannot be undone.',
      cancel: 'Cancel',
      confirm: 'Confirm',
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
      startChapter: '챕터 시작',
      continueLearning: '이어서 학습하기',
      // Settings
      settings: '설정',
      settingsTitle: '설정',
      resetProgress: '학습 진행 초기화',
      resetProgressDesc: '완료한 질문을 모두 지우고 처음부터 시작합니다',
      deleteAllChats: '모든 채팅 삭제',
      deleteAllChatsDesc: '모든 대화 기록을 삭제합니다',
      confirmReset: '정말로 진행하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      cancel: '취소',
      confirm: '확인',
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

  const completedQuestions = progress?.completedQuestions || [];

  const refreshRecommendedQuestions = useCallback(() => {
    const completed = progress?.completedQuestions || [];
    const uncompletedQuestions = allQuestions.filter(q => !completed.includes(q.id));
    const questionsToUse = uncompletedQuestions.length >= 4 ? uncompletedQuestions : allQuestions;
    const shuffled = [...questionsToUse].sort(() => Math.random() - 0.5);
    setRecommendedQuestions(shuffled.slice(0, 4));
  }, [allQuestions, progress?.completedQuestions]);

  useEffect(() => {
    refreshRecommendedQuestions();
  }, [refreshRecommendedQuestions]);

  // Use real progress data from service
  const totalQuestions = overallProgress.total;
  const completedCount = overallProgress.completed;
  const progressPercent = overallProgress.percentage;

  // Calculate part progress using service
  const getPartProgress = (part) => {
    return getPartProgressFromService(part.id, part.chapters);
  };

  // Use real stats from service
  const streakDays = stats.streakDays;
  const thisWeekCount = stats.thisWeekCount;

  const togglePart = (partId) => {
    setExpandedPart(expandedPart === partId ? null : partId);
    setExpandedChapter(null);
  };

  const toggleChapter = (chapterId, e) => {
    e.stopPropagation();
    setExpandedChapter(expandedChapter === chapterId ? null : chapterId);
  };

  const handleQuestionClick = (question, chapter, part) => {
    // Find the index of the clicked question in the chapter
    const questionIndex = chapter.questions.findIndex(q => q.id === question.id);

    // Prepare all chapter questions for sequential navigation
    const chapterQs = chapter.questions.map(q => ({
      id: q.id,
      text: q[language] || q.en
    }));

    onStartConversation({
      week: `Part ${part.id}`,
      title: chapter.title[language] || chapter.title.en,
      initialPrompt: question[language] || question.en,
      prompt: question[language] || question.en,
      chapterQuestions: chapterQs,
      currentQuestionIndex: questionIndex !== -1 ? questionIndex : 0,
      chapterId: chapter.id,
      partId: part.id
    });
  };

  // Start chapter learning - sends all questions in the chapter
  const handleStartChapter = (chapter, part, e) => {
    e.stopPropagation();
    const chapterQs = chapter.questions.map(q => ({
      id: q.id,
      text: q[language] || q.en
    }));
    onStartConversation({
      week: `Part ${part.id}`,
      title: chapter.title[language] || chapter.title.en,
      initialPrompt: chapterQs[0].text,
      prompt: chapterQs[0].text,
      chapterQuestions: chapterQs,
      currentQuestionIndex: 0,
      chapterId: chapter.id,
      partId: part.id
    });
  };

  // Get next question info for display
  const nextQuestionInfo = useMemo(() => {
    return findNextQuestion(curriculum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Quick start - continue from last position or start from beginning
  const handleContinueLearning = () => {
    const next = nextQuestionInfo;
    const chapterQs = next.chapter.questions.map(q => ({
      id: q.id,
      text: q[language] || q.en
    }));
    onStartConversation({
      week: `Part ${next.part.id}`,
      title: next.chapter.title[language] || next.chapter.title.en,
      initialPrompt: next.question[language] || next.question.en,
      prompt: next.question[language] || next.question.en,
      chapterQuestions: chapterQs,
      currentQuestionIndex: next.questionIndex,
      chapterId: next.chapter.id,
      partId: next.part.id
    });
  };

  // Reset learning progress
  const handleResetProgress = () => {
    if (window.confirm(text.confirmReset)) {
      localStorage.removeItem('flutter_learning_progress');
      localStorage.removeItem('flutter_recent_history');
      setRecentHistory([]);
      loadProgress();
      setShowSettings(false);
    }
  };

  // Delete all conversations
  const handleDeleteAllChats = async () => {
    if (window.confirm(text.confirmReset)) {
      if (onDeleteAllConversations) {
        await onDeleteAllConversations();
      }
      setShowSettings(false);
    }
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
            <button className="settings-btn" onClick={() => setShowSettings(true)} title={text.settings}>
              <HiCog />
            </button>
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

        <div className="header-buttons">
          <button
            className="continue-learning-btn"
            onClick={handleContinueLearning}
          >
            <HiPlay />
            <span className="continue-btn-text">
              <span className="continue-btn-main">{text.continueLearning}</span>
              <span className="continue-btn-position">
                Part {nextQuestionInfo.part.id} • Ch. {nextQuestionInfo.chapter.id} • Q{nextQuestionInfo.questionIndex + 1}
              </span>
            </span>
          </button>

          <button
            className="new-chat-btn"
            onClick={() => onStartConversation({
              week: 'new',
              title: 'New Chat',
              initialPrompt: null
            })}
          >
            <HiSparkles />
            {text.startNewChat}
          </button>
        </div>
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
            {curriculum.parts.map(part => {
              const partProgress = getPartProgress(part);
              return (
                <div key={part.id} className="part-progress-item">
                  <span className="part-progress-name" style={{ color: part.color }}>
                    Part {part.id}
                  </span>
                  <div className="part-progress-bar">
                    <div
                      className="part-progress-fill"
                      style={{ width: `${partProgress.percentage}%`, backgroundColor: part.color }}
                    />
                  </div>
                  <span className="part-progress-text">{partProgress.percentage}%</span>
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
          <button className="tip-refresh-btn" onClick={refreshTip} title={text.refreshQuestions}>
            <HiRefresh />
          </button>
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
                  {part.chapters.map((chapter) => {
                    const chapterComplete = isChapterCompleted(chapter.id);
                    return (
                      <div key={chapter.id} className="chapter-container">
                        <div
                          className={`chapter-header ${expandedChapter === chapter.id ? 'expanded' : ''} ${chapterComplete ? 'completed' : ''}`}
                          onClick={(e) => toggleChapter(chapter.id, e)}
                        >
                          <div className="chapter-info">
                            <span className="chapter-number">
                              {chapterComplete && <HiCheckCircle className="chapter-complete-icon" />}
                              Ch. {chapter.id}
                            </span>
                            <span className="chapter-title">{chapter.title[language] || chapter.title.en}</span>
                          </div>
                          <div className="chapter-meta">
                            <span className="question-count">{chapter.questions.length} {text.questions}</span>
                            <button
                              className="start-chapter-btn"
                              onClick={(e) => handleStartChapter(chapter, part, e)}
                              style={{ backgroundColor: part.color }}
                            >
                              <HiPlay />
                              {text.startChapter}
                            </button>
                            <span className="expand-icon">
                              {expandedChapter === chapter.id ? <HiChevronDown /> : <HiChevronRight />}
                            </span>
                          </div>
                        </div>

                        {expandedChapter === chapter.id && (
                          <div className="questions-list">
                            {chapter.questions.map((question) => {
                              const questionComplete = completedQuestions.includes(question.id);
                              return (
                                <button
                                  key={question.id}
                                  className={`question-btn ${questionComplete ? 'completed' : ''}`}
                                  onClick={() => handleQuestionClick(question, chapter, part)}
                                >
                                  <span className="question-id">
                                    {questionComplete ? <HiCheckCircle className="question-complete-icon" /> : question.id}
                                  </span>
                                  <span className="question-text">{question[language] || question.en}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2><HiCog /> {text.settingsTitle}</h2>
              <button className="settings-close-btn" onClick={() => setShowSettings(false)}>
                <HiX />
              </button>
            </div>
            <div className="settings-modal-content">
              <div className="settings-item">
                <div className="settings-item-info">
                  <h3><HiRefresh /> {text.resetProgress}</h3>
                  <p>{text.resetProgressDesc}</p>
                </div>
                <button className="settings-danger-btn" onClick={handleResetProgress}>
                  <HiExclamation />
                  {text.confirm}
                </button>
              </div>
              <div className="settings-item">
                <div className="settings-item-info">
                  <h3><HiTrash /> {text.deleteAllChats}</h3>
                  <p>{text.deleteAllChatsDesc}</p>
                </div>
                <button className="settings-danger-btn" onClick={handleDeleteAllChats}>
                  <HiExclamation />
                  {text.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;