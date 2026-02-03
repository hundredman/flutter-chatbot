// Learning Progress Service
// Manages user's learning progress in localStorage

const STORAGE_KEY = 'flutter_learning_progress';

const getDefaultProgress = () => ({
  completedQuestions: [],      // Array of question IDs
  completedChapters: [],       // Array of chapter IDs
  currentPosition: {           // Last learning position
    partId: null,
    chapterId: null,
    questionId: null
  },
  stats: {
    totalQuestionsLearned: 0,
    streakDays: 0,
    lastStudyDate: null,
    thisWeekCount: 0,
    weekStartDate: null
  }
});

// Get progress from localStorage
export const getProgress = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...getDefaultProgress(), ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading progress:', e);
  }
  return getDefaultProgress();
};

// Save progress to localStorage
const saveProgress = (progress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Error saving progress:', e);
  }
};

// Mark a question as completed
export const markQuestionCompleted = (questionId, chapterId, partId) => {
  const progress = getProgress();

  // Add question if not already completed
  if (!progress.completedQuestions.includes(questionId)) {
    progress.completedQuestions.push(questionId);
    progress.stats.totalQuestionsLearned = progress.completedQuestions.length;
  }

  // Update streak
  updateStreak(progress);

  saveProgress(progress);
  return progress;
};

// Update the last viewed question without marking it completed
export const updateLastViewedQuestion = (partId, chapterId, questionId) => {
  const progress = getProgress();
  progress.currentPosition = {
    partId,
    chapterId,
    questionId
  };
  saveProgress(progress);
  return progress;
};

// Mark a chapter as completed
export const markChapterCompleted = (chapterId) => {
  const progress = getProgress();

  if (!progress.completedChapters.includes(chapterId)) {
    progress.completedChapters.push(chapterId);
  }

  saveProgress(progress);
  return progress;
};

// Check if a question is completed
export const isQuestionCompleted = (questionId) => {
  const progress = getProgress();
  return progress.completedQuestions.includes(questionId);
};

// Check if a chapter is completed
export const isChapterCompleted = (chapterId) => {
  const progress = getProgress();
  return progress.completedChapters.includes(chapterId);
};

// Get completion count for a chapter
export const getChapterProgress = (chapterId, totalQuestions) => {
  const progress = getProgress();
  const chapterQuestions = progress.completedQuestions.filter(
    qId => qId.startsWith(`${chapterId}.`)
  );
  return {
    completed: chapterQuestions.length,
    total: totalQuestions,
    percentage: totalQuestions > 0 ? Math.round((chapterQuestions.length / totalQuestions) * 100) : 0
  };
};

// Get completion count for a part
export const getPartProgress = (partId, chapters) => {
  const progress = getProgress();
  let totalQuestions = 0;
  let completedCount = 0;

  chapters.forEach(chapter => {
    totalQuestions += chapter.questions.length;
    chapter.questions.forEach(q => {
      if (progress.completedQuestions.includes(q.id)) {
        completedCount++;
      }
    });
  });

  return {
    completed: completedCount,
    total: totalQuestions,
    percentage: totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0
  };
};

// Get overall progress
export const getOverallProgress = (curriculum) => {
  const progress = getProgress();
  let totalQuestions = 0;

  curriculum.parts.forEach(part => {
    part.chapters.forEach(chapter => {
      totalQuestions += chapter.questions.length;
    });
  });

  return {
    completed: progress.completedQuestions.length,
    total: totalQuestions,
    percentage: totalQuestions > 0 ? Math.round((progress.completedQuestions.length / totalQuestions) * 100) : 0
  };
};

// Update streak logic
const updateStreak = (progress) => {
  const today = new Date().toDateString();
  const lastStudy = progress.stats.lastStudyDate;

  if (lastStudy !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastStudy === yesterday.toDateString()) {
      // Consecutive day
      progress.stats.streakDays += 1;
    } else if (lastStudy !== today) {
      // Streak broken, reset to 1
      progress.stats.streakDays = 1;
    }

    progress.stats.lastStudyDate = today;
  }

  // Update weekly count
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  if (!progress.stats.weekStartDate || new Date(progress.stats.weekStartDate) < weekStart) {
    progress.stats.weekStartDate = weekStart.toISOString();
    progress.stats.thisWeekCount = 1;
  } else {
    progress.stats.thisWeekCount += 1;
  }
};

// Get learning stats
export const getStats = () => {
  const progress = getProgress();
  return {
    totalQuestionsLearned: progress.stats.totalQuestionsLearned,
    streakDays: progress.stats.streakDays,
    thisWeekCount: progress.stats.thisWeekCount
  };
};

// Find next uncompleted question
export const findNextQuestion = (curriculum) => {
  const progress = getProgress();

  for (const part of curriculum.parts) {
    for (const chapter of part.chapters) {
      for (let i = 0; i < chapter.questions.length; i++) {
        const question = chapter.questions[i];
        if (!progress.completedQuestions.includes(question.id)) {
          return {
            question,
            chapter,
            part,
            questionIndex: i
          };
        }
      }
    }
  }

  // All completed, return first question
  const firstPart = curriculum.parts[0];
  const firstChapter = firstPart.chapters[0];
  return {
    question: firstChapter.questions[0],
    chapter: firstChapter,
    part: firstPart,
    questionIndex: 0,
    allCompleted: true
  };
};

// Find next chapter after current
export const findNextChapter = (currentChapterId, curriculum) => {
  let foundCurrent = false;

  for (const part of curriculum.parts) {
    for (const chapter of part.chapters) {
      if (foundCurrent) {
        return { chapter, part };
      }
      if (chapter.id === currentChapterId) {
        foundCurrent = true;
      }
    }
  }

  // No next chapter (reached end)
  return null;
};

// Get the last interacted question info from currentPosition
export const getLastPositionInfo = (curriculum) => {
  const progress = getProgress();
  const { partId, chapterId, questionId } = progress.currentPosition;

  // Check if currentPosition has been updated from the default and has a valid questionId
  if (partId && chapterId && questionId) {
    const part = curriculum.parts.find(p => p.id === partId);
    if (part) {
      const chapter = part.chapters.find(c => c.id === chapterId);
      if (chapter) {
        const questionIndex = chapter.questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
          return {
            question: chapter.questions[questionIndex],
            chapter,
            part,
            questionIndex
          };
        }
      }
    }
  }

  // Fallback for default state or if the stored position is somehow invalid
  const firstPart = curriculum.parts[0];
  const firstChapter = firstPart.chapters[0];
  return {
    question: firstChapter.questions[0],
    chapter: firstChapter,
    part: firstPart,
    questionIndex: 0
  };
};

// Reset all progress
export const resetProgress = () => {
  saveProgress(getDefaultProgress());
};
