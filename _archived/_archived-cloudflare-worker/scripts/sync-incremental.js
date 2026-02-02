/**
 * Flutter 문서 증분 동기화 - 변경된 문서만 업데이트
 * 콘텐츠 해시를 비교하여 실제로 변경된 문서만 임베딩 생성
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';

const SITEMAP_URL = 'https://docs.flutter.dev/sitemap.xml';
const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

/**
 * 콘텐츠 해시 생성 (MD5)
 */
function getContentHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Worker에서 기존 문서 해시 목록 가져오기
 */
async function getExistingHashes() {
  try {
    const response = await axios.get(`${WORKER_URL}/api/doc-hashes`, { timeout: 30000 });
    return response.data.hashes || {};
  } catch (error) {
    console.log('⚠️ 기존 해시 없음 (첫 실행이거나 API 미지원)');
    return {};
  }
}

/**
 * Worker에 해시 저장
 */
async function saveHashes(hashes) {
  try {
    await axios.post(`${WORKER_URL}/api/doc-hashes`, { hashes }, { timeout: 30000 });
  } catch (error) {
    console.error('⚠️ 해시 저장 실패:', error.message);
  }
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
        content: { parts: [{ text: text.substring(0, 8000) }] }
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
    console.log(`📡 Sitemap 가져오는 중...`);
    const response = await axios.get(SITEMAP_URL, { timeout: 30000 });
    const result = await parseStringPromise(response.data);

    const urls = result.urlset.url
      .map(entry => entry.loc[0])
      .filter(url =>
        !url.includes('/api/') &&
        !url.includes('/release/archive') &&
        !url.includes('/404') &&
        !url.includes('#') &&
        url.startsWith('https://docs.flutter.dev/')
      );

    console.log(`✅ ${urls.length}개 URL 발견\n`);
    return urls;
  } catch (error) {
    console.error('❌ Sitemap 가져오기 실패:', error.message);
    return [];
  }
}

/**
 * HTML에서 텍스트 추출
 */
function extractContent(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, .sidebar, .nav, .menu, .breadcrumbs').remove();

  const mainContent = $('main, article, .content, .main-content').first();
  const content = mainContent.length > 0 ? mainContent.text() : $('body').text();

  let title = $('h1').first().text() || $('title').text() || '';
  title = title.replace(' | Flutter', '').replace(' - Flutter', '').trim();

  const cleanedContent = content.replace(/\s+/g, ' ').trim().substring(0, 8000);

  return { title, content: cleanedContent };
}

/**
 * URL에서 문서 ID 생성
 */
function getDocId(url) {
  let docId = url
    .replace(/https?:\/\/docs\.flutter\.dev\//, '')
    .replace(/[^a-zA-Z0-9]/g, '_');

  if (docId.length > 64) {
    const hash = docId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
    docId = docId.substring(0, 55) + '_' + hash;
  }
  return docId;
}

/**
 * 단일 문서 크롤링
 */
async function fetchDocument(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlutterChatbot/1.0)' },
    });

    const { title, content } = extractContent(response.data);
    if (content.length < 100) return null;

    return { url, title, content, hash: getContentHash(content) };
  } catch (error) {
    return null;
  }
}

/**
 * 변경된 문서만 동기화
 */
async function syncChangedDocuments(changedDocs) {
  if (changedDocs.length === 0) {
    console.log('✅ 변경된 문서 없음!\n');
    return { success: 0, failed: 0 };
  }

  console.log(`📤 ${changedDocs.length}개 변경된 문서 동기화 중...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < changedDocs.length; i++) {
    const doc = changedDocs[i];
    console.log(`[${i + 1}/${changedDocs.length}] ${doc.title?.substring(0, 40)}...`);

    // 임베딩 생성
    const embedding = await getGeminiEmbedding(doc.content);
    if (!embedding) {
      failCount++;
      continue;
    }

    const docId = getDocId(doc.url);
    const vector = {
      id: docId,
      values: embedding,
      metadata: {
        title: doc.title.substring(0, 200),
        content: doc.content.substring(0, 2000),
        url: doc.url,
        type: 'official-docs',
        hash: doc.hash,
      },
    };

    // Vectorize에 업로드
    try {
      await axios.post(`${WORKER_URL}/api/sync-vectors`, {
        vectors: [vector],
      }, { timeout: 60000 });

      console.log(`   ✅ 완료`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ 실패: ${error.message}`);
      failCount++;
    }

    // Rate limiting - Gemini 무료 계정 제한 대응 (분당 60 요청)
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return { success: successCount, failed: failCount };
}

/**
 * 메인 실행
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🔄 Flutter 문서 증분 동기화');
  console.log('═'.repeat(60));
  console.log('\n변경된 문서만 업데이트합니다.\n');

  // 1. 기존 해시 가져오기
  const existingHashes = await getExistingHashes();
  console.log(`📋 기존 문서: ${Object.keys(existingHashes).length}개\n`);

  // 2. Sitemap에서 URL 목록 가져오기
  const urls = await getAllUrlsFromSitemap();
  if (urls.length === 0) process.exit(1);

  // 3. 모든 문서 크롤링 및 해시 비교
  console.log('🔍 문서 변경 사항 확인 중...\n');

  const newHashes = {};
  const changedDocs = [];
  const newDocs = [];
  const unchangedCount = { value: 0 };

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const docId = getDocId(url);

    if ((i + 1) % 100 === 0) {
      console.log(`   진행: ${i + 1}/${urls.length} (${Math.round((i + 1) / urls.length * 100)}%)`);
    }

    const doc = await fetchDocument(url);
    if (!doc) continue;

    newHashes[docId] = doc.hash;

    if (!existingHashes[docId]) {
      // 새 문서
      newDocs.push(doc);
    } else if (existingHashes[docId] !== doc.hash) {
      // 변경된 문서
      changedDocs.push(doc);
    } else {
      // 변경 없음
      unchangedCount.value++;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 변경 사항 요약:`);
  console.log(`   🆕 새 문서: ${newDocs.length}개`);
  console.log(`   ✏️  수정됨: ${changedDocs.length}개`);
  console.log(`   ✅ 변경없음: ${unchangedCount.value}개\n`);

  // 4. 변경된 문서만 동기화
  const allChanged = [...newDocs, ...changedDocs];
  const result = await syncChangedDocuments(allChanged);

  // 5. 새 해시 저장
  await saveHashes(newHashes);

  // 6. 결과 출력
  console.log('═'.repeat(60));
  console.log('📊 최종 결과:');
  console.log(`   ✅ 성공: ${result.success}개`);
  console.log(`   ❌ 실패: ${result.failed}개`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
