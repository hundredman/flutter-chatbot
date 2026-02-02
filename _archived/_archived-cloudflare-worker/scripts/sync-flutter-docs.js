/**
 * Flutter 공식 문서를 Vectorize에 동기화
 * 주요 Flutter 문서 페이지들의 내용을 크롤링하고 임베딩하여 저장
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

// 크롤링할 Flutter 문서 URL 목록
const flutterDocsUrls = [
  // 기본 개념
  'https://docs.flutter.dev/get-started/install',
  'https://docs.flutter.dev/get-started/editor',
  'https://docs.flutter.dev/get-started/test-drive',
  'https://docs.flutter.dev/get-started/codelab',

  // UI & 위젯
  'https://docs.flutter.dev/ui/widgets',
  'https://docs.flutter.dev/ui/layout',
  'https://docs.flutter.dev/ui/interactive',
  'https://docs.flutter.dev/ui/assets/assets-and-images',
  'https://docs.flutter.dev/ui/navigation',
  'https://docs.flutter.dev/ui/animations',

  // State Management
  'https://docs.flutter.dev/data-and-backend/state-mgmt/intro',
  'https://docs.flutter.dev/data-and-backend/state-mgmt/declarative',
  'https://docs.flutter.dev/data-and-backend/state-mgmt/ephemeral-vs-app',
  'https://docs.flutter.dev/data-and-backend/state-mgmt/simple',
  'https://docs.flutter.dev/data-and-backend/state-mgmt/options',

  // 데이터 & 백엔드
  'https://docs.flutter.dev/data-and-backend/networking',
  'https://docs.flutter.dev/data-and-backend/json',
  'https://docs.flutter.dev/data-and-backend/sqlite',
  'https://docs.flutter.dev/data-and-backend/firebase',

  // 플랫폼 통합
  'https://docs.flutter.dev/platform-integration/platform-channels',
  'https://docs.flutter.dev/platform-integration/android/c-interop',
  'https://docs.flutter.dev/platform-integration/ios/c-interop',
  'https://docs.flutter.dev/platform-integration/web/building',

  // 테스팅
  'https://docs.flutter.dev/testing/overview',
  'https://docs.flutter.dev/cookbook/testing/unit/introduction',
  'https://docs.flutter.dev/cookbook/testing/widget/introduction',
  'https://docs.flutter.dev/cookbook/testing/integration/introduction',

  // 성능 & 최적화
  'https://docs.flutter.dev/perf/best-practices',
  'https://docs.flutter.dev/perf/rendering-performance',
  'https://docs.flutter.dev/perf/shader',

  // 배포
  'https://docs.flutter.dev/deployment/android',
  'https://docs.flutter.dev/deployment/ios',
  'https://docs.flutter.dev/deployment/web',
];

/**
 * HTML에서 텍스트 콘텐츠 추출
 */
function extractContent(html) {
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $('script, style, nav, footer, .sidebar, .nav, .menu').remove();

  // 메인 콘텐츠 추출
  const mainContent = $('main, article, .content, .main-content').first();
  const content = mainContent.length > 0 ? mainContent.text() : $('body').text();

  // 제목 추출
  const title = $('h1').first().text() || $('title').text() || 'Flutter Documentation';

  // 텍스트 정리
  const cleanedContent = content
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .replace(/\n+/g, '\n') // 여러 줄바꿈을 하나로
    .trim()
    .substring(0, 8000); // 최대 8000자로 제한

  return { title, content: cleanedContent };
}

/**
 * URL에서 문서 크롤링
 */
async function fetchDocument(url) {
  try {
    console.log(`📄 Fetching: ${url}`);
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlutterChatbot/1.0)',
      },
    });

    const { title, content } = extractContent(response.data);

    return {
      url,
      title,
      content,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * 모든 문서 크롤링
 */
async function fetchAllDocuments() {
  console.log(`\n🚀 Starting to fetch ${flutterDocsUrls.length} Flutter documentation pages...\n`);

  const documents = [];

  // 순차적으로 크롤링 (병렬로 하면 rate limit 걸릴 수 있음)
  for (const url of flutterDocsUrls) {
    const doc = await fetchDocument(url);
    if (doc && doc.content.length > 100) {
      documents.push(doc);
      console.log(`✅ Success: ${doc.title} (${doc.content.length} chars)`);
    }

    // Rate limiting: 요청 사이에 1초 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Fetched ${documents.length} documents successfully!\n`);
  return documents;
}

/**
 * Cloudflare Worker API를 통해 문서 삽입
 */
async function syncToVectorize(documents) {
  const workerUrl = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';
  const batchSize = 5; // 한 번에 5개씩 삽입

  console.log(`📤 Syncing ${documents.length} documents to Vectorize...\n`);

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    try {
      const response = await axios.post(`${workerUrl}/api/sync-docs`, {
        documents: batch,
      });

      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Synced ${batch.length} documents`);
      console.log(`   Response:`, response.data);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to sync batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
    }
  }

  console.log(`\n✅ Sync completed!\n`);
}

/**
 * 메인 실행
 */
async function main() {
  try {
    // 1. 문서 크롤링
    const documents = await fetchAllDocuments();

    if (documents.length === 0) {
      console.error('❌ No documents fetched. Exiting.');
      process.exit(1);
    }

    // 2. Vectorize에 동기화
    await syncToVectorize(documents);

    console.log('🎉 All done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행시에만 main() 호출
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
