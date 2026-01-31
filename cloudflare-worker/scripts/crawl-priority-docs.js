/**
 * Flutter 문서 우선순위 크롤러
 * 가장 자주 사용되는 핵심 문서부터 순차적으로 동기화
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

// 우선순위별 문서 URL (가장 중요한 순서)
const PRIORITY_DOCS = {
  // 1단계: 핵심 위젯 & 기본 개념 (필수)
  tier1: [
    'https://docs.flutter.dev/get-started/install',
    'https://docs.flutter.dev/get-started/editor',
    'https://docs.flutter.dev/get-started/test-drive',
    'https://docs.flutter.dev/get-started/codelab',
    'https://docs.flutter.dev/ui/widgets-intro',
    'https://docs.flutter.dev/ui/widgets/basics',
    'https://docs.flutter.dev/ui/layout',
    'https://docs.flutter.dev/ui/layout/tutorial',
    'https://docs.flutter.dev/ui/layout/constraints',
    'https://docs.flutter.dev/ui/interactivity',
    'https://docs.flutter.dev/ui/assets/images',
    'https://docs.flutter.dev/cookbook/design/themes',
    'https://docs.flutter.dev/ui/design/material',
  ],

  // 2단계: 상태 관리 (매우 자주 질문됨)
  tier2: [
    'https://docs.flutter.dev/data-and-backend/state-mgmt/intro',
    'https://docs.flutter.dev/data-and-backend/state-mgmt/simple',
    'https://docs.flutter.dev/data-and-backend/state-mgmt/options',
    'https://docs.flutter.dev/data-and-backend/state-mgmt/declarative',
    'https://docs.flutter.dev/data-and-backend/state-mgmt/ephemeral-vs-app',
    'https://docs.flutter.dev/cookbook/forms/validation',
    'https://docs.flutter.dev/cookbook/forms/text-input',
    'https://docs.flutter.dev/cookbook/forms/focus',
    'https://docs.flutter.dev/cookbook/forms/retrieve-input',
  ],

  // 3단계: 네비게이션 & 라우팅
  tier3: [
    'https://docs.flutter.dev/ui/navigation',
    'https://docs.flutter.dev/cookbook/navigation/navigation-basics',
    'https://docs.flutter.dev/cookbook/navigation/named-routes',
    'https://docs.flutter.dev/cookbook/navigation/passing-data',
    'https://docs.flutter.dev/cookbook/navigation/returning-data',
    'https://docs.flutter.dev/cookbook/navigation/navigate-with-arguments',
    'https://docs.flutter.dev/ui/navigation/deep-linking',
  ],

  // 4단계: 네트워킹 & 데이터
  tier4: [
    'https://docs.flutter.dev/cookbook/networking/fetch-data',
    'https://docs.flutter.dev/cookbook/networking/send-data',
    'https://docs.flutter.dev/cookbook/networking/update-data',
    'https://docs.flutter.dev/cookbook/networking/delete-data',
    'https://docs.flutter.dev/cookbook/networking/authenticated-requests',
    'https://docs.flutter.dev/cookbook/networking/web-sockets',
    'https://docs.flutter.dev/data-and-backend/serialization/json',
    'https://docs.flutter.dev/cookbook/persistence/sqlite',
    'https://docs.flutter.dev/cookbook/persistence/key-value',
    'https://docs.flutter.dev/cookbook/persistence/reading-writing-files',
  ],

  // 5단계: 애니메이션 & 고급 UI
  tier5: [
    'https://docs.flutter.dev/ui/animations',
    'https://docs.flutter.dev/ui/animations/tutorial',
    'https://docs.flutter.dev/ui/animations/implicit-animations',
    'https://docs.flutter.dev/ui/animations/hero-animations',
    'https://docs.flutter.dev/ui/animations/staggered-animations',
    'https://docs.flutter.dev/cookbook/animation/animated-container',
    'https://docs.flutter.dev/cookbook/animation/page-route-animation',
    'https://docs.flutter.dev/cookbook/effects/parallax-scrolling',
    'https://docs.flutter.dev/cookbook/lists/long-lists',
    'https://docs.flutter.dev/cookbook/lists/mixed-list',
  ],

  // 6단계: 테스트 & 디버깅
  tier6: [
    'https://docs.flutter.dev/testing/overview',
    'https://docs.flutter.dev/cookbook/testing/unit/introduction',
    'https://docs.flutter.dev/cookbook/testing/widget/introduction',
    'https://docs.flutter.dev/cookbook/testing/integration/introduction',
    'https://docs.flutter.dev/testing/debugging',
    'https://docs.flutter.dev/tools/devtools/overview',
    'https://docs.flutter.dev/testing/errors',
  ],

  // 7단계: 플랫폼별 & 배포
  tier7: [
    'https://docs.flutter.dev/deployment/android',
    'https://docs.flutter.dev/deployment/ios',
    'https://docs.flutter.dev/deployment/web',
    'https://docs.flutter.dev/platform-integration/platform-channels',
    'https://docs.flutter.dev/platform-integration/android/platform-views',
    'https://docs.flutter.dev/platform-integration/ios/platform-views',
    'https://docs.flutter.dev/add-to-app',
  ],
};

/**
 * HTML에서 텍스트 콘텐츠 추출
 */
function extractContent(html, url) {
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $('script, style, nav, footer, .sidebar, .nav, .menu, .breadcrumbs, .site-header, .site-footer').remove();
  $('.next-previous-links, .page-github-links').remove();

  // 메인 콘텐츠 추출
  const mainContent = $('main, article, .content, .main-content, #page-content').first();
  const content = mainContent.length > 0 ? mainContent.text() : $('body').text();

  // 제목 추출
  let title = $('h1').first().text() || $('title').text() || '';
  title = title.replace(' | Flutter', '').replace(' - Flutter', '').trim();

  // 텍스트 정리
  const cleanedContent = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
    .substring(0, 8000);

  return { title, content: cleanedContent, url };
}

/**
 * URL에서 문서 크롤링
 */
async function fetchDocument(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FlutterChatbot/1.0)',
      },
    });

    const { title, content } = extractContent(response.data, url);

    if (content.length < 100) {
      return null;
    }

    return {
      url,
      title,
      content,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

/**
 * Cloudflare Worker API를 통해 문서 삽입
 */
async function syncToVectorize(documents) {
  const batchSize = 5; // 안정성을 위해 5개씩

  console.log(`📤 Syncing ${documents.length} documents to Vectorize...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    try {
      console.log(`📦 Batch ${batchNum}/${totalBatches}: Syncing ${batch.length} documents...`);

      const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
        documents: batch,
      }, {
        timeout: 60000,
      });

      console.log(`   ✅ ${response.data.message}`);
      successCount += batch.length;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed batch ${batchNum}:`, error.message);
      failCount += batch.length;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return { successCount, failCount };
}

/**
 * 특정 티어만 크롤링
 */
async function crawlTier(tierName, urls) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📚 Processing ${tierName}: ${urls.length} documents`);
  console.log('═'.repeat(60));

  const documents = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`📄 [${i + 1}/${urls.length}] ${url}`);

    const doc = await fetchDocument(url);
    if (doc) {
      documents.push(doc);
      console.log(`   ✅ ${doc.title} (${doc.content.length} chars)`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (documents.length > 0) {
    const result = await syncToVectorize(documents);
    console.log(`\n📊 ${tierName} Summary: ${result.successCount}/${documents.length} synced`);
  }

  return documents.length;
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(arg => arg.startsWith('--tier='));
  const selectedTier = tierArg ? tierArg.split('=')[1] : null;
  const allTiers = args.includes('--all');

  console.log('═'.repeat(60));
  console.log('🎯 Flutter Documentation Priority Crawler');
  console.log('═'.repeat(60));
  console.log('\nThis crawler syncs Flutter docs by priority tier.\n');

  // 총 문서 수 계산
  const totalDocs = Object.values(PRIORITY_DOCS).reduce((sum, urls) => sum + urls.length, 0);
  console.log('📊 Available tiers:');
  Object.entries(PRIORITY_DOCS).forEach(([tier, urls]) => {
    console.log(`   ${tier}: ${urls.length} documents`);
  });
  console.log(`   Total: ${totalDocs} documents\n`);

  if (selectedTier) {
    // 특정 티어만 실행
    if (!PRIORITY_DOCS[selectedTier]) {
      console.error(`❌ Unknown tier: ${selectedTier}`);
      console.log('Available tiers: tier1, tier2, tier3, tier4, tier5, tier6, tier7');
      process.exit(1);
    }
    await crawlTier(selectedTier, PRIORITY_DOCS[selectedTier]);
  } else if (allTiers) {
    // 모든 티어 순차 실행
    let totalSynced = 0;
    for (const [tier, urls] of Object.entries(PRIORITY_DOCS)) {
      totalSynced += await crawlTier(tier, urls);
      // 티어 간 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log(`\n🎉 All tiers completed! Total: ${totalSynced} documents synced`);
  } else {
    // 사용법 안내
    console.log('Usage:');
    console.log('  node crawl-priority-docs.js --tier=tier1  # Sync specific tier');
    console.log('  node crawl-priority-docs.js --all         # Sync all tiers');
    console.log('\nRecommended: Start with tier1, then add more as needed.');
  }
}

main().catch(console.error);
