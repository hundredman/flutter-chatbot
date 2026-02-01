import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyBzqNddc6cp0122mWRfO0ez8E1wv95k3-4';
const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

async function test() {
  // 1. Get embedding
  const embedRes = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
    { model: 'models/text-embedding-004', content: { parts: [{ text: 'DevTools 2.16.0 release notes test' }] } }
  );
  
  const vector = {
    id: 'docs_flutter_dev_tools_devtools_release_notes_release_notes_2_16_0',
    values: embedRes.data.embedding.values,
    metadata: {
      title: 'DevTools 2.16.0 release notes',
      content: 'This is a test content for release notes.',
      url: 'https://docs.flutter.dev/tools/devtools/release-notes/release-notes-2.16.0',
      type: 'official-docs'
    }
  };
  
  console.log('Vector ID length:', vector.id.length);
  console.log('Metadata size:', JSON.stringify(vector.metadata).length);
  
  // 2. Insert to Worker
  try {
    const res = await axios.post(`${WORKER_URL}/api/sync-vectors`, { vectors: [vector] }, { timeout: 60000 });
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }
}

test();
