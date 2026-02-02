/**
 * Flutter 문서 크롤러 - Gemini 임베딩 사용
 * Cloudflare AI 대신 Gemini API로 임베딩 생성 (빠름 + 안정적)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';

const SITEMAP_URL = 'https://docs.flutter.dev/sitemap.xml';
const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

// Gemini API 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 환경변수가 필요합니다.');
  console.log('\n설정 방법:');
  console.log('  export GEMINI_API_KEY="your-api-key"');
  console.log('\nAPI 키 발급: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

/**
 * Gemini API로 임베딩 생성
 */
async function getGeminiEmbedding(text) {
  try {
    const response = await axios.post(
      `${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`,
      {
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text: text.substring(0, 8000) }]
        }
      },
      { timeout: 30000 }
    );

    return response.data.embedding.values;
  } catch (error) {
    console.error(`   ❌ Gemini 임베딩 실패: ${error.message}`);
    return null;
  }
}

/**
 * Sitemap에서 모든 URL 가져오기
 */
async function getAllUrlsFromSitemap() {
  try {
    console.log(`📡 Fetching sitemap from ${SITEMAP_URL}...`);
    const response = await axios.get(SITEMAP_URL, { timeout: 30000 });
    const xml = response.data;

    const result = await parseStringPromise(xml);
    const urls = result.urlset.url
      .map(entry => entry.loc[0])
      .filter(url => {
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

  $('script, style, nav, footer, .sidebar, .nav, .menu, .breadcrumbs, .site-header, .site-footer').remove();
  $('.next-previous-links, .page-github-links').remove();

  const mainContent = $('main, article, .content, .main-content, #page-content').first();
  const content = mainContent.length > 0 ? mainContent.text() : $('body').text();

  let title = $('h1').first().text() || $('title').text() || '';
  title = title.replace(' | Flutter', '').replace(' - Flutter', '').trim();

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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlutterChatbot/1.0)' },
    });

    const { title, content } = extractContent(response.data, url);

    if (content.length < 100) return null;

    return { url, title, content, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return null;
  }
}

/**
 * 모든 문서 크롤링
 */
async function fetchAllDocuments(urls) {
  console.log(`🚀 Crawling ${urls.length} pages...\n`);

  const documents = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    if ((i + 1) % 50 === 0 || i === 0) {
      console.log(`📄 [${i + 1}/${urls.length}] ${Math.round((i + 1) / urls.length * 100)}%`);
    }

    const doc = await fetchDocument(url);
    if (doc) documents.push(doc);

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Crawled ${documents.length} documents\n`);
  return documents;
}

/**
 * Gemini로 임베딩 생성 후 Vectorize에 저장
 */
async function syncWithGeminiEmbeddings(documents) {
  console.log(`📤 Syncing ${documents.length} documents with Gemini embeddings...`);
  console.log(`   Estimated time: ~${Math.ceil(documents.length * 2 / 60)} minutes\n`);

  let successCount = 0;
  let failCount = 0;

  // 배치 크기: 3개씩 (안정성 위해)
  const batchSize = 3;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    console.log(`📦 Batch ${batchNum}/${totalBatches}: Processing ${batch.length} documents...`);

    const vectors = [];

    for (const doc of batch) {
      // Gemini로 임베딩 생성
      const embedding = await getGeminiEmbedding(doc.content);

      if (!embedding) {
        failCount++;
        continue;
      }

      // ID 최대 64 bytes 제한
      let docId = doc.url
        .replace(/https?:\/\/docs\.flutter\.dev\//, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
      if (docId.length > 64) {
        // 해시로 단축
        const hash = docId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
        docId = docId.substring(0, 55) + '_' + hash;
      }

      vectors.push({
        id: docId,
        values: embedding,
        metadata: {
          title: doc.title.substring(0, 200),
          content: doc.content.substring(0, 2000),  // 2KB로 제한 (10KB 제한)
          url: doc.url,
          type: 'official-docs',
        },
      });

      // Gemini rate limit: 무료 계정 분당 60 요청 - 1.5초 대기
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Worker에 벡터 직접 전송 (임베딩 생성 없이)
    if (vectors.length > 0) {
      try {
        const response = await axios.post(`${WORKER_URL}/api/sync-vectors`, {
          vectors: vectors,
        }, {
          timeout: 120000, // 2분 타임아웃
        });

        console.log(`   ✅ Inserted ${vectors.length} vectors`);
        successCount += vectors.length;
      } catch (error) {
        console.error(`   ❌ Failed to insert: ${error.message}`);
        // 실패 시 1개씩 재시도
        for (const v of vectors) {
          try {
            await axios.post(`${WORKER_URL}/api/sync-vectors`, {
              vectors: [v],
            }, { timeout: 60000 });
            console.log(`      🔄 Retry OK: ${v.metadata.title?.substring(0, 30)}`);
            successCount++;
          } catch (e) {
            console.error(`      ❌ Retry failed: ${v.id}`);
            failCount++;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // 배치 간 3초 대기
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log(`\n📊 Final Summary:`);
  console.log(`   ✅ Success: ${successCount} documents`);
  console.log(`   ❌ Failed: ${failCount} documents`);
  console.log(`   📈 Success Rate: ${((successCount / documents.length) * 100).toFixed(1)}%\n`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 Flutter Docs Crawler with Gemini Embeddings');
  console.log('═'.repeat(60));
  console.log('\nUsing Gemini API for fast, reliable embeddings\n');

  const urls = await getAllUrlsFromSitemap();
  if (urls.length === 0) process.exit(1);

  const documents = await fetchAllDocuments(urls);
  if (documents.length === 0) process.exit(1);

  await syncWithGeminiEmbeddings(documents);

  console.log('═'.repeat(60));
  console.log('🎉 Complete!');
  console.log('═'.repeat(60));
}

main().catch(console.error);
