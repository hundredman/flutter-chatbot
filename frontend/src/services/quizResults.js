const STORAGE_KEY = 'flutter_quiz_results';

// { id, partId, score, total, percent, takenAt }
export const saveQuizResult = (partId, score, total) => {
  const results = getQuizResults();
  results.unshift({
    id: Date.now().toString(),
    partId,
    score,
    total,
    percent: total > 0 ? Math.round((score / total) * 100) : 0,
    takenAt: new Date().toISOString(),
  });
  // Keep last 50 results
  localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, 50)));
};

export const getQuizResults = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

// Total number of quizzes taken
export const getQuizCount = () => getQuizResults().length;
