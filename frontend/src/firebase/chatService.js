import { db } from './config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';

// Create a new conversation
export const createConversation = async (userId, title, initialPrompt = null) => {
  try {
    const conversationData = {
      userId,
      title,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messageCount: 0
    };

    if (initialPrompt) {
      conversationData.initialPrompt = initialPrompt;
    }

    const docRef = await addDoc(collection(db, 'conversations'), conversationData);

    return {
      success: true,
      conversationId: docRef.id,
      conversation: {
        id: docRef.id,
        ...conversationData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { success: false, error: error.message };
  }
};

// Get all conversations for a user
export const getUserConversations = async (userId) => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(50) // Limit to recent 50 conversations
    );

    const querySnapshot = await getDocs(q);
    const conversations = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    return { success: true, conversations };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { success: false, error: error.message };
  }
};

// Get a specific conversation
export const getConversation = async (conversationId) => {
  try {
    const docRef = doc(db, 'conversations', conversationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        success: true,
        conversation: {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
      };
    } else {
      return { success: false, error: 'Conversation not found' };
    }
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return { success: false, error: error.message };
  }
};

const MESSAGE_SIZE_LIMIT_BYTES = 900 * 1024; // 900KB (Firestore 1MB doc limit)

// Update conversation (add message, update title, etc.)
export const updateConversation = async (conversationId, updates) => {
  try {
    const docRef = doc(db, 'conversations', conversationId);

    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // If adding messages, check size limit and update message count
    if (updates.messages) {
      const sizeBytes = new Blob([JSON.stringify(updates.messages)]).size;
      if (sizeBytes > MESSAGE_SIZE_LIMIT_BYTES) {
        return { success: false, limitReached: true, error: 'conversation_limit_reached' };
      }
      updateData.messageCount = updates.messages.length;
    }

    await updateDoc(docRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating conversation:', error);
    return { success: false, error: error.message };
  }
};

// Delete a conversation
export const deleteConversation = async (conversationId) => {
  try {
    await deleteDoc(doc(db, 'conversations', conversationId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: error.message };
  }
};

// Update conversation title
export const updateConversationTitle = async (conversationId, title) => {
  try {
    await updateConversation(conversationId, { title });
    return { success: true };
  } catch (error) {
    console.error('Error updating conversation title:', error);
    return { success: false, error: error.message };
  }
};

// Generate conversation title from first message
export const generateConversationTitle = (firstMessage) => {
  if (!firstMessage || !firstMessage.content) {
    return 'New Chat';
  }

  const content = firstMessage.content.trim();

  // If message is short, use it as title
  if (content.length <= 50) {
    return content;
  }

  // Extract first sentence or truncate
  const firstSentence = content.match(/^[^.!?]*[.!?]/);
  if (firstSentence && firstSentence[0].length <= 50) {
    return firstSentence[0].trim();
  }

  // Truncate to 47 chars + "..."
  return content.substring(0, 47) + '...';
};