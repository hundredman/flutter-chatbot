/**
 * Flutter 문서 전체 크롤러 - Sitemap 기반
 * Flutter 공식 문서의 sitemap.xml을 파싱하여 모든 문서 URL을 가져옴
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';

const SITEMAP_URL = 'https://docs.flutter.dev/sitemap.xml';
const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

/**
 * Sitemap에서 모든 URL 가져오기
 */
async function getAllUrlsFromSitemap() {
  try {
    console.log(`📡 Fetching sitemap from ${SITEMAP_URL}...`);
    const response = await axios.get(SITEMAP_URL, { timeout: 30000 });
    const xml = response.data;

    console.log('🔍 Parsing sitemap XML...');
    const result = await parseStringPromise(xml);

    const urls = result.urlset.url
      .map(entry => entry.loc[0])
      .filter(url => {
        // API 문서, 릴리즈 노트, 404 페이지 등 제외
        return !url.includes('/api/') &&
               !url.includes('/release/archive') &&
               !url.includes('/404') &&
               !url.includes('#') &&
               url.startsWith('https://docs.flutter.dev/');
      });

    console.log(`✅ Found ${urls.length} documentation URLs\n`);
    return urls;
  } catch (error) {
    console.error('❌ Failed to fetch sitemap:', error.message);
    return [];
  }
}

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
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .replace(/\n+/g, '\n') // 여러 줄바꿈을 하나로
    .trim()
    .substring(0, 8000); // 최대 8000자로 제한

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
      return null; // 너무 짧은 콘텐츠는 제외
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
 * 모든 문서 크롤링
 */
async function fetchAllDocuments(urls) {
  console.log(`\n🚀 Starting to crawl ${urls.length} documentation pages...\n`);

  const documents = [];
  const failed = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${urls.length}]`;

    console.log(`📄 ${progress} ${url}`);

    const doc = await fetchDocument(url);
    if (doc) {
      documents.push(doc);
      console.log(`   ✅ ${doc.title} (${doc.content.length} chars)`);
    } else {
      failed.push(url);
    }

    // Rate limiting: 요청 사이에 500ms 대기
    await new Promise(resolve => setTimeout(resolve, 500));

    // 진행 상황 로그 (매 50개마다)
    if ((i + 1) % 50 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${urls.length} (${Math.round((i + 1) / urls.length * 100)}%)`);
      console.log(`   ✅ Success: ${documents.length}`);
      console.log(`   ❌ Failed: ${failed.length}\n`);
    }
  }

  console.log(`\n✅ Crawling completed!`);
  console.log(`   Total: ${urls.length}`);
  console.log(`   Success: ${documents.length}`);
  console.log(`   Failed: ${failed.length}\n`);

  return documents;
}

/**
 * Cloudflare Worker API를 통해 문서 삽입
 */
async function syncToVectorize(documents) {
  const batchSize = 2; // 한 번에 2개씩 삽입 (안정성 우선)

  console.log(`📤 Syncing ${documents.length} documents to Vectorize...`);
  console.log(`   Batch size: ${batchSize} (slow but reliable)`);
  console.log(`   Estimated time: ~${Math.ceil(documents.length / batchSize * 8 / 60)} minutes\n`);

  let successCount = 0;
  let failCount = 0;
  let retryQueue = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    try {
      console.log(`📦 Batch ${batchNum}/${totalBatches}: Syncing ${batch.length} documents...`);

      const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
        documents: batch,
      }, {
        timeout: 120000, // 120초 타임아웃
      });

      console.log(`   ✅ ${response.data.message}`);
      successCount += batch.length;

      // Rate limiting: 배치 사이에 6초 대기
      await new Promise(resolve => setTimeout(resolve, 6000));
    } catch (error) {
      console.error(`   ❌ Failed batch ${batchNum}:`, error.message);
      if (error.response) {
        console.error(`      Status: ${error.response.status}`);
      }
      failCount += batch.length;
      retryQueue.push(...batch); // 실패한 문서 재시도 큐에 추가

      // 실패 시 5초 대기 후 재시도
      console.log(`      ⏳ Waiting 5s before continuing...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // 실패한 문서 재시도 (1개씩)
  if (retryQueue.length > 0) {
    console.log(`\n🔄 Retrying ${retryQueue.length} failed documents (1 at a time)...\n`);

    for (let i = 0; i < retryQueue.length; i++) {
      const doc = retryQueue[i];
      try {
        console.log(`🔄 Retry ${i + 1}/${retryQueue.length}: ${doc.title?.substring(0, 40)}...`);

        const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
          documents: [doc],
        }, {
          timeout: 120000,
        });

        console.log(`   ✅ ${response.data.message}`);
        successCount += 1;
        failCount -= 1;

        // 재시도 시 10초 대기
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        console.error(`   ❌ Retry failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  console.log(`\n📊 Final Sync Summary:`);
  console.log(`   ✅ Success: ${successCount} documents`);
  console.log(`   ❌ Failed: ${failCount} documents`);
  console.log(`   📈 Success Rate: ${((successCount / documents.length) * 100).toFixed(1)}%\n`);
}

/**
 * 메인 실행
 */
async function main() {
  try {
    console.log('═'.repeat(70));
    console.log('🤖 Flutter Documentation Complete Crawler (Sitemap-based)');
    console.log('═'.repeat(70));
    console.log('\nThis will crawl ALL Flutter documentation pages from sitemap.');
    console.log('Estimated time: 30-60 minutes depending on network speed.\n');

    // 1. Sitemap에서 URL 가져오기
    const urls = await getAllUrlsFromSitemap();

    if (urls.length === 0) {
      console.error('❌ No URLs found in sitemap. Exiting.');
      process.exit(1);
    }

    console.log(`📊 Will process ${urls.length} documentation pages\n`);

    // 2. 모든 문서 크롤링
    const documents = await fetchAllDocuments(urls);

    if (documents.length === 0) {
      console.error('❌ No documents crawled. Exiting.');
      process.exit(1);
    }

    console.log(`\n📊 Crawling Statistics:`);
    console.log(`   Total URLs: ${urls.length}`);
    console.log(`   Documents crawled: ${documents.length}`);
    console.log(`   Average length: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / documents.length)} chars`);
    console.log(`   Total size: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / 1024)} KB\n`);

    // 3. Vectorize에 동기화
    await syncToVectorize(documents);

    console.log('═'.repeat(70));
    console.log('🎉 Complete! All Flutter documentation synced successfully!');
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행시에만 main() 호출
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
