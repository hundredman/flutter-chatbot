/**
 * Flutter 문서 전체 동기화 (GitHub Tree API 사용)
 * 단일 API 호출로 모든 파일 목록을 가져와서 효율적으로 처리
 */

import axios from 'axios';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'flutter';
const REPO_NAME = 'website';
const BRANCH = 'main';
const DOCS_PATH_PREFIX = 'src/content'; // 문서 경로 필터

// GitHub Token (optional - for higher rate limit)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

/**
 * GitHub API 요청 헤더
 */
function getHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'FlutterChatbot/1.0',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log('🔑 Using GitHub token for authenticated requests\n');
  } else {
    console.log('⚠️  No GitHub token found. Rate limit: 60 requests/hour');
    console.log('   Set GITHUB_TOKEN env variable for 5000 requests/hour\n');
  }

  return headers;
}

/**
 * GitHub Tree API로 모든 파일 가져오기 (단일 요청)
 */
async function getAllFilesFromTree() {
  try {
    console.log(`🌲 Fetching complete file tree from ${REPO_OWNER}/${REPO_NAME}...`);

    // 1. 최신 commit SHA 가져오기
    const branchUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}`;
    const branchResponse = await axios.get(branchUrl, { headers: getHeaders() });
    const commitSha = branchResponse.data.commit.sha;
    console.log(`📌 Latest commit: ${commitSha}\n`);

    // 2. Tree API로 전체 파일 트리 가져오기 (recursive=1)
    const treeUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${commitSha}?recursive=1`;
    console.log('📡 Fetching full repository tree (this may take a moment)...');
    const treeResponse = await axios.get(treeUrl, { headers: getHeaders() });
    const tree = treeResponse.data.tree;

    console.log(`✅ Retrieved ${tree.length} total items\n`);

    // 3. 마크다운 파일만 필터링
    const mdFiles = tree.filter(item =>
      item.type === 'blob' &&
      item.path.endsWith('.md') &&
      item.path.startsWith(DOCS_PATH_PREFIX)
    );

    console.log(`📝 Found ${mdFiles.length} markdown files in ${DOCS_PATH_PREFIX}/\n`);

    return mdFiles.map(file => ({
      path: file.path,
      name: file.path.split('/').pop(),
      sha: file.sha,
      size: file.size,
      url: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${file.path}`,
    }));
  } catch (error) {
    console.error('❌ Failed to fetch tree:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message}`);
    }
    return [];
  }
}

/**
 * 마크다운 파일에서 콘텐츠 추출
 */
async function fetchMarkdownContent(fileInfo) {
  try {
    const response = await axios.get(fileInfo.url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'FlutterChatbot/1.0',
      },
    });

    const content = response.data;

    // 제목 추출 (첫 번째 # 헤딩 또는 파일명)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileInfo.name.replace('.md', '');

    // 텍스트 정리
    const cleanedContent = content
      .replace(/^---[\s\S]*?---/m, '') // Front matter 제거
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
    // 404 에러는 조용히 처리 (파일이 삭제되었을 수 있음)
    if (error.response?.status !== 404) {
      console.error(`   ❌ ${fileInfo.name}: ${error.message}`);
    }
    return null;
  }
}

/**
 * 모든 문서 다운로드
 */
async function fetchAllDocuments(files) {
  console.log(`🚀 Downloading content from ${files.length} markdown files...\n`);

  const documents = [];
  const failed = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progress = `[${i + 1}/${files.length}]`;

    if (i % 50 === 0) {
      console.log(`📊 Progress: ${progress} (${Math.round((i / files.length) * 100)}%)`);
    }

    const doc = await fetchMarkdownContent(file);
    if (doc && doc.content.length > 100) {
      documents.push({
        ...doc,
        fetchedAt: new Date().toISOString(),
      });
    } else {
      failed.push(file.path);
    }

    // Rate limiting: 100ms 대기
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Download completed!`);
  console.log(`   Success: ${documents.length} documents`);
  console.log(`   Skipped: ${failed.length} (empty or too short)\n`);

  return documents;
}

/**
 * Vectorize에 동기화
 */
async function syncToVectorize(documents) {
  const batchSize = 2; // Reduced from 5 to 2 for Worker CPU timeout

  console.log(`📤 Syncing ${documents.length} documents to Vectorize...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(documents.length / batchSize);

    try {
      console.log(`📦 Batch ${batchNum}/${totalBatches}: ${batch.length} docs`);

      const response = await axios.post(`${WORKER_URL}/api/sync-docs`, {
        documents: batch,
      }, {
        timeout: 120000, // Increased from 90s to 120s
      });

      console.log(`   ✅ ${response.data.message}`);
      successCount += batch.length;

      await new Promise(resolve => setTimeout(resolve, 3000)); // 3s between successful batches
    } catch (error) {
      console.error(`   ❌ Batch ${batchNum} failed: ${error.message}`);
      failCount += batch.length;
      await new Promise(resolve => setTimeout(resolve, 10000)); // Increased from 8s to 10s after failures
    }
  }

  console.log(`\n📊 Sync Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📈 Success Rate: ${((successCount / documents.length) * 100).toFixed(1)}%\n`);
}

/**
 * 메인 실행
 */
async function main() {
  console.log('═'.repeat(70));
  console.log('🤖 Flutter Documentation Sync (GitHub Tree API)');
  console.log('═'.repeat(70));
  console.log('\nEfficient method: Uses single API call to get all files\n');

  try {
    // 1. Tree API로 모든 파일 목록 가져오기
    const files = await getAllFilesFromTree();

    if (files.length === 0) {
      console.error('❌ No files found. Exiting.');
      process.exit(1);
    }

    // 2. 모든 파일 콘텐츠 다운로드
    const documents = await fetchAllDocuments(files);

    if (documents.length === 0) {
      console.error('❌ No documents processed. Exiting.');
      process.exit(1);
    }

    console.log(`📊 Statistics:`);
    console.log(`   Total files: ${files.length}`);
    console.log(`   Processed: ${documents.length}`);
    console.log(`   Avg length: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / documents.length)} chars`);
    console.log(`   Total size: ${Math.round(documents.reduce((sum, d) => sum + d.content.length, 0) / 1024)} KB\n`);

    // 3. Vectorize에 동기화
    await syncToVectorize(documents);

    console.log('═'.repeat(70));
    console.log('🎉 Complete! All documents synced successfully!');
    console.log('═'.repeat(70));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
