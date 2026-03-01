import { db } from './config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Firestore cache key: quiz_cache/{partId}_{YYYY-MM-DD}
const getCacheKey = (partId) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${partId}_${today}`;
};

// Get cached quiz from Firestore
export const getCachedQuiz = async (partId) => {
  try {
    const cacheKey = getCacheKey(partId);
    const docRef = doc(db, 'quiz_cache', cacheKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { success: true, questions: docSnap.data().questions };
    }
    return { success: false };
  } catch (error) {
    console.error('Error getting cached quiz:', error);
    return { success: false };
  }
};

// Save generated quiz to Firestore
const saveQuizCache = async (partId, questions) => {
  try {
    const cacheKey = getCacheKey(partId);
    await setDoc(doc(db, 'quiz_cache', cacheKey), {
      partId,
      questions,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving quiz cache:', error);
  }
};

// Generate quiz via API and cache it
export const generateQuiz = async (partId, chapters, language = 'ko') => {
  try {
    // Check cache first
    const cached = await getCachedQuiz(partId);
    if (cached.success) {
      console.log(`Quiz cache hit for Part ${partId}`);
      return { success: true, questions: cached.questions, fromCache: true };
    }

    // Generate via API
    const response = await fetch(`${API_BASE_URL}/api/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partId, chapters, language })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.questions) {
      throw new Error('Invalid quiz response');
    }

    // Save to cache
    await saveQuizCache(partId, data.questions);

    return { success: true, questions: data.questions, fromCache: false };
  } catch (error) {
    console.error('Quiz generation error:', error);
    return { success: false, error: error.message };
  }
};
