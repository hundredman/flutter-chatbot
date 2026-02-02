/**
 * Flutter 공식 문서 전체 동기화
 * GitHub API를 사용하여 flutter/website 저장소의 모든 문서를 자동으로 크롤링
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'flutter';
const REPO_NAME = 'website';
const DOCS_PATH = 'src/content'; // Flutter 문서가 있는 경로

// GitHub API 토큰 (선택사항 - rate limit 증가)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * GitHub API 요청 헤더
 */
function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'FlutterChatbot/1.0',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * GitHub에서 디렉토리 내 파일 목록 가져오기 (재귀적)
 */
async function getFilesRecursively(path = DOCS_PATH, branch = 'main') {
  try {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`;
    console.log(`📂 Fetching: ${path}`);

    const response = await axios.get(url, { headers: getHeaders() });
    const items = response.data;

    let allFiles = [];

    for (const item of items) {
      if (item.type === 'file' && item.name.endsWith('.md')) {
        // 마크다운 파일 추가
        allFiles.push({
          path: item.path,
          name: item.name,
          download_url: item.download_url,
        });
      } else if (item.type === 'dir') {
        // 하위 디렉토리 재귀 탐색
        const subFiles = await getFilesRecursively(item.path, branch);
        allFiles = allFiles.concat(subFiles);
      }
    }

    return allFiles;
  } catch (error) {
    console.error(`❌ Failed to fetch ${path}:`, error.message);
    return [];
  }
}

/**
 * 마크다운 파일에서 콘텐츠 추출
 */
async function fetchMarkdownContent(fileInfo) {
  try {
    const response = await axios.get(fileInfo.download_url, {
      headers: getHeaders(),
      timeout: 10000,
    });

    const content = response.data;

    // 제목 추출 (첫 번째 # 헤딩)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileInfo.name.replace('.md', '');

    // 텍스트 정리
    const cleanedContent = content
      .replace(/^---[\s\S]*?---/m, '') // Front matter 제거
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거 (선택사항)
      .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 링크를 텍스트로
      .replace(/#{1,6}\s/g, '') // 헤딩 마크 제거
      .replace(/\s+/g, ' ') // 여러 공백을 하나로
      .trim()
      .substring(0, 8000); // 최대 8000자

    // docs.flutter.dev URL 생성
    const docUrl = `https://docs.flutter.dev/${fileInfo.path
      .replace('src/content/', '')
      .replace('.md', '')
      .replace('/index', '')}`;

    return {
      title,
      content: cleanedContent,
      url: docUrl,
      path: fileInfo.path,
    };
  } catch (error) {
    console.error(`❌ Failed to fetch ${fileInfo.name}:`, error.message);
    return null;
  }
}

/**
 * 모든 문서 크롤링
 */
async function fetchAllDocuments() {
  console.log(`\n🚀 Starting comprehensive Flutter documentation crawl...`);
  console.log(`📦 Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`📁 Path: ${DOCS_PATH}\n`);

  // 1. 모든 마크다운 파일 목록 가져오기
  console.log('Step 1: Discovering all markdown files...');
  const files = await getFilesRecursively();
  console.log(`✅ Found ${files.length} markdown files\n`);

  if (files.length === 0) {
    console.error('❌ No files found. Check repository path and branch.');
    return [];
  }

  // 2. 각 파일 콘텐츠 다운로드
  console.log('Step 2: Downloading file contents...');
  const documents = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`📄 [${i + 1}/${files.length}] ${file.path}`);

    const doc = await fetchMarkdownContent(file);
    if (doc && doc.content.length > 100) {
      documents.push({
        ...doc,
        fetchedAt: new Date().toISOString(),
      });
      console.log(`   ✅ ${doc.title} (${doc.content.length} chars)`);
    } else {
      console.log(`   ⏭️  Skipped (empty or too short)`);
    }

    // Rate limiting: 요청 사이에 100ms 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Successfully crawled ${documents.length} documents!\n`);
  return documents;
}

/**
 * Cloudflare Worker API를 통해 문서 삽입
 */
async function syncToVectorize(documents) {
  const workerUrl = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';
  const batchSize = 10; // 한 번에 10개씩 삽입

  console.log(`📤 Syncing ${documents.length} documents to Vectorize...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    try {
      console.log(`📦 Batch ${batchNum}/${totalBatches}: Syncing ${batch.length} documents...`);

      const response = await axios.post(`${workerUrl}/api/sync-docs`, {
        documents: batch,
      }, {
        timeout: 60000, // 60초 타임아웃
      });

      console.log(`   ✅ Success: ${response.data.message}`);
      successCount += batch.length;

      // Rate limiting: 배치 사이에 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Failed batch ${batchNum}:`, error.message);
      if (error.response) {
        console.error(`      Status: ${error.response.status}`);
        console.error(`      Data:`, error.response.data);
      }
      failCount += batch.length;

      // 실패 시 5초 대기 후 재시도
      console.log(`      ⏳ Waiting 5s before continuing...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n📊 Sync Summary:`);
  console.log(`   ✅ Success: ${successCount} documents`);
  console.log(`   ❌ Failed: ${failCount} documents`);
  console.log(`   📈 Success Rate: ${((successCount / documents.length) * 100).toFixed(1)}%\n`);
}

/**
 * 메인 실행
 */
async function main() {
  try {
    console.log('═'.repeat(60));
    console.log('🤖 Flutter Documentation Comprehensive Sync');
    console.log('═'.repeat(60));

    // 1. 문서 크롤링
    const documents = await fetchAllDocuments();

    if (documents.length === 0) {
      console.error('❌ No documents crawled. Exiting.');
      process.exit(1);
    }

    console.log(`📊 Statistics:`);
    console.log(`   Total documents: ${documents.length}`);
    console.log(`   Average length: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / documents.length)} chars`);
    console.log(`   Total size: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / 1024)} KB\n`);

    // 2. Vectorize에 동기화
    await syncToVectorize(documents);

    console.log('═'.repeat(60));
    console.log('🎉 All done!');
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행시에만 main() 호출
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
