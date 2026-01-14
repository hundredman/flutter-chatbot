import { createConversation, getUserConversations } from './chatService';

// Test function to create sample conversations
export const createTestConversations = async (userId) => {
  try {
    console.log('Creating test conversations for user:', userId);

    // Create 3 test conversations
    const testConversations = [
      {
        title: 'How to build Flutter apps',
        initialPrompt: 'How do I get started with Flutter development?'
      },
      {
        title: 'State management in Flutter',
        initialPrompt: 'What are the best state management solutions for Flutter?'
      },
      {
        title: 'Flutter deployment guide',
        initialPrompt: 'How do I deploy my Flutter app to the app stores?'
      }
    ];

    for (const conv of testConversations) {
      const result = await createConversation(userId, conv.title, conv.initialPrompt);
      if (result.success) {
        console.log('Created conversation:', result.conversationId);
      } else {
        console.error('Failed to create conversation:', result.error);
      }
    }

    // Verify conversations were created
    const getResult = await getUserConversations(userId);
    console.log('User conversations after test creation:', getResult);

  } catch (error) {
    console.error('Error in createTestConversations:', error);
  }
};

// Test function to check if conversations exist
export const testConversationRetrieval = async (userId) => {
  try {
    console.log('Testing conversation retrieval for user:', userId);
    const result = await getUserConversations(userId);
    console.log('getUserConversations result:', result);
    return result;
  } catch (error) {
    console.error('Error in testConversationRetrieval:', error);
    return { success: false, error: error.message };
  }
};