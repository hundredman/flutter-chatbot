import React, { useState, useCallback } from 'react';
import './QuizMode.css';
import { HiX, HiCheckCircle, HiXCircle, HiChevronRight, HiRefresh, HiAcademicCap, HiLightningBolt } from 'react-icons/hi';
import { curriculum } from '../data/curriculum';
import { generateQuiz } from '../firebase/quizService';

const QuizMode = ({ onClose, language = 'ko', initialPartId = null, initialChapterIds = null }) => {
  const getInitialPart = () =>
    initialPartId ? curriculum.parts.find(p => p.id === initialPartId) || null : null;

  const [phase, setPhase] = useState('select'); // select | loading | quiz | result
  const [selectedPart, setSelectedPart] = useState(getInitialPart);
  const [selectedChapterIds, setSelectedChapterIds] = useState(initialChapterIds || []);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]); // per-question results
  const [error, setError] = useState(null);

  const t = {
    ko: {
      title: '퀴즈 모드',
      selectPart: '파트를 선택하세요',
      selectChapters: '챕터를 선택하세요',
      allChapters: '전체 챕터',
      startQuiz: '퀴즈 시작',
      generating: 'AI가 문제를 생성 중입니다...',
      question: '문제',
      of: '/',
      correct: '정답!',
      wrong: '오답',
      explanation: '해설',
      next: '다음 문제',
      finish: '결과 보기',
      result: '퀴즈 결과',
      score: '점수',
      correctCount: '맞힌 문제',
      retry: '다시 풀기',
      backToSelect: '파트 선택으로',
      close: '닫기',
      errorMsg: '문제 생성에 실패했습니다. 다시 시도해주세요.',
      retry2: '다시 시도',
      chapterFilter: '챕터 필터',
      questionsCount: '문제',
      fromCache: '오늘의 문제',
      fresh: '새로 생성됨',
    },
    en: {
      title: 'Quiz Mode',
      selectPart: 'Select a Part',
      selectChapters: 'Select Chapters',
      allChapters: 'All Chapters',
      startQuiz: 'Start Quiz',
      generating: 'AI is generating questions...',
      question: 'Q',
      of: '/',
      correct: 'Correct!',
      wrong: 'Wrong',
      explanation: 'Explanation',
      next: 'Next',
      finish: 'See Results',
      result: 'Quiz Results',
      score: 'Score',
      correctCount: 'Correct',
      retry: 'Try Again',
      backToSelect: 'Back to Select',
      close: 'Close',
      errorMsg: 'Failed to generate questions. Please try again.',
      retry2: 'Retry',
      chapterFilter: 'Chapter Filter',
      questionsCount: 'questions',
      fromCache: "Today's Questions",
      fresh: 'Freshly Generated',
    }
  };
  const text = t[language] || t.ko;

  const handleSelectPart = (part) => {
    setSelectedPart(part);
    setSelectedChapterIds([]); // default: none selected
  };

  const toggleChapter = (chapterId) => {
    setSelectedChapterIds(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  const handleStartQuiz = useCallback(async () => {
    if (!selectedPart || selectedChapterIds.length === 0) return;

    setPhase('loading');
    setError(null);

    const filteredChapters = selectedPart.chapters
      .filter(ch => selectedChapterIds.includes(ch.id))
      .map(ch => ({
        id: ch.id,
        title: ch.title[language] || ch.title.en,
        topics: ch.questions.map(q => q[language] || q.en).slice(0, 4)
      }));

    const result = await generateQuiz(selectedPart.id, filteredChapters, language);

    if (!result.success) {
      setError(result.error || text.errorMsg);
      setPhase('select');
      return;
    }

    // Filter to only selected chapters
    const filtered = result.questions.filter(q =>
      selectedChapterIds.includes(q.chapterId)
    );

    setQuestions(filtered.length > 0 ? filtered : result.questions);
    setCurrentIndex(0);
    setScore(0);
    setResults([]);
    setSelectedOption(null);
    setAnswered(false);
    setPhase('quiz');
  }, [selectedPart, selectedChapterIds, language, text.errorMsg]);

  const handleSelectOption = (index) => {
    if (answered) return;
    setSelectedOption(index);
    setAnswered(true);

    const isCorrect = index === questions[currentIndex].answerIndex;
    if (isCorrect) setScore(s => s + 1);
    setResults(prev => [...prev, { isCorrect, selected: index }]);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('result');
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setScore(0);
    setResults([]);
    setSelectedOption(null);
    setAnswered(false);
    setPhase('quiz');
  };

  const getOptionClass = (index) => {
    if (!answered) return 'quiz-option';
    if (index === questions[currentIndex].answerIndex) return 'quiz-option correct';
    if (index === selectedOption) return 'quiz-option wrong';
    return 'quiz-option dimmed';
  };

  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="quiz-overlay" onClick={onClose}>
      <div className="quiz-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="quiz-header">
          <div className="quiz-header-left">
            <HiAcademicCap className="quiz-header-icon" />
            <h2>{text.title}</h2>
          </div>
          <button className="quiz-close-btn" onClick={onClose}><HiX /></button>
        </div>

        {/* Phase: Select */}
        {phase === 'select' && (
          <div className="quiz-select-phase">
            {!selectedPart ? (
              <>
                <p className="quiz-phase-label">{text.selectPart}</p>
                <div className="quiz-part-grid">
                  {curriculum.parts.map(part => (
                    <button
                      key={part.id}
                      className="quiz-part-card"
                      style={{ borderTopColor: part.color }}
                      onClick={() => handleSelectPart(part)}
                    >
                      <span className="quiz-part-badge" style={{ backgroundColor: part.color }}>
                        Part {part.id}
                      </span>
                      <span className="quiz-part-title">{part.title[language] || part.title.en}</span>
                      <span className="quiz-part-meta">
                        {part.chapters.length} chapters · {part.chapters.length * 3} {text.questionsCount}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="quiz-back-row">
                  <button className="quiz-back-btn" onClick={() => setSelectedPart(null)}>
                    ← Part {selectedPart.id}
                  </button>
                </div>
                <p className="quiz-phase-label">{text.selectChapters}</p>
                <div className="quiz-chapter-list">
                  <button
                    className={`quiz-chapter-item ${selectedChapterIds.length === selectedPart.chapters.length ? 'selected' : ''}`}
                    onClick={() => setSelectedChapterIds(
                      selectedChapterIds.length === selectedPart.chapters.length
                        ? []
                        : selectedPart.chapters.map(c => c.id)
                    )}
                  >
                    <span>{text.allChapters}</span>
                    <span className="quiz-chapter-count">{selectedPart.chapters.length * 3} {text.questionsCount}</span>
                  </button>
                  {selectedPart.chapters.map(ch => (
                    <button
                      key={ch.id}
                      className={`quiz-chapter-item ${selectedChapterIds.includes(ch.id) ? 'selected' : ''}`}
                      onClick={() => toggleChapter(ch.id)}
                    >
                      <span>Ch. {ch.id} · {ch.title[language] || ch.title.en}</span>
                      <span className="quiz-chapter-count">3 {text.questionsCount}</span>
                    </button>
                  ))}
                </div>
                {error && <p className="quiz-error">{error}</p>}
                <button
                  className="quiz-start-btn"
                  style={{ backgroundColor: selectedPart.color }}
                  disabled={selectedChapterIds.length === 0}
                  onClick={handleStartQuiz}
                >
                  <HiLightningBolt />
                  {text.startQuiz} ({selectedChapterIds.length * 3} {text.questionsCount})
                </button>
              </>
            )}
          </div>
        )}

        {/* Phase: Loading */}
        {phase === 'loading' && (
          <div className="quiz-loading">
            <div className="quiz-loading-spinner" />
            <p>{text.generating}</p>
          </div>
        )}

        {/* Phase: Quiz */}
        {phase === 'quiz' && questions.length > 0 && (
          <div className="quiz-question-phase">
            <div className="quiz-progress-row">
              <span className="quiz-progress-text">
                {text.question} {currentIndex + 1} {text.of} {questions.length}
              </span>
              <div className="quiz-progress-bar">
                <div
                  className="quiz-progress-fill"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="quiz-question-card">
              <p className="quiz-question-text">{questions[currentIndex].question}</p>
            </div>

            <div className="quiz-options">
              {questions[currentIndex].options.map((option, index) => (
                <button
                  key={index}
                  className={getOptionClass(index)}
                  onClick={() => handleSelectOption(index)}
                >
                  <span className="quiz-option-label">{String.fromCharCode(65 + index)}</span>
                  <span className="quiz-option-text">{option}</span>
                  {answered && index === questions[currentIndex].answerIndex && (
                    <HiCheckCircle className="quiz-option-icon correct-icon" />
                  )}
                  {answered && index === selectedOption && index !== questions[currentIndex].answerIndex && (
                    <HiXCircle className="quiz-option-icon wrong-icon" />
                  )}
                </button>
              ))}
            </div>

            {answered && (
              <div className={`quiz-feedback ${results[results.length - 1]?.isCorrect ? 'correct' : 'wrong'}`}>
                <p className="quiz-feedback-title">
                  {results[results.length - 1]?.isCorrect ? `✓ ${text.correct}` : `✗ ${text.wrong}`}
                </p>
                <p className="quiz-feedback-explanation">
                  <strong>{text.explanation}:</strong> {questions[currentIndex].explanation}
                </p>
                <button className="quiz-next-btn" onClick={handleNext}>
                  {currentIndex + 1 >= questions.length ? text.finish : text.next}
                  <HiChevronRight />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: Result */}
        {phase === 'result' && (
          <div className="quiz-result-phase">
            <div className="quiz-result-circle">
              <svg viewBox="0 0 100 100">
                <circle className="quiz-result-ring-bg" cx="50" cy="50" r="40" />
                <circle
                  className="quiz-result-ring-fill"
                  cx="50" cy="50" r="40"
                  style={{ strokeDasharray: `${scorePercent * 2.51} 251` }}
                />
              </svg>
              <div className="quiz-result-score-text">
                <span className="quiz-result-percent">{scorePercent}%</span>
                <span className="quiz-result-fraction">{score}/{questions.length}</span>
              </div>
            </div>

            <p className="quiz-result-label">
              {scorePercent >= 80 ? '🎉' : scorePercent >= 50 ? '💪' : '📚'}&nbsp;
              {scorePercent >= 80
                ? (language === 'ko' ? '훌륭합니다!' : 'Excellent!')
                : scorePercent >= 50
                  ? (language === 'ko' ? '잘 했어요!' : 'Good job!')
                  : (language === 'ko' ? '더 연습해봐요!' : 'Keep practicing!')}
            </p>

            <div className="quiz-result-list">
              {results.map((r, i) => (
                <div key={i} className={`quiz-result-item ${r.isCorrect ? 'correct' : 'wrong'}`}>
                  {r.isCorrect ? <HiCheckCircle /> : <HiXCircle />}
                  <span className="quiz-result-item-text">{questions[i].question}</span>
                </div>
              ))}
            </div>

            <div className="quiz-result-actions">
              <button className="quiz-retry-btn" onClick={handleRetry}>
                <HiRefresh /> {text.retry}
              </button>
              <button className="quiz-back-select-btn" onClick={() => { setSelectedPart(null); setPhase('select'); }}>
                {text.backToSelect}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuizMode;
