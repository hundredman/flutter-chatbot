/**
 * Flutter 문서 RAG 파이프라인 - GitHub + Section Chunking
 *
 * 1. GitHub에서 Markdown 직접 가져오기
 * 2. Section 단위로 chunking
 * 3. Gemini Embedding으로 벡터 생성
 * 4. Cloudflare Vectorize에 저장
 */

import axios from 'axios';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'flutter';
const REPO_NAME = 'website';
const BRANCH = 'main';
const DOCS_PATH = 'src/content';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
const WORKER_URL = 'https://flutter-chatbot-worker.hiprojectflutterchatbot.workers.dev';

// 재개 시작 인덱스 (0부터 시작, 이전에 처리된 파일 수)
const START_INDEX = parseInt(process.env.START_INDEX || '0', 10);

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

/**
 * GitHub Tree API로 모든 마크다운 파일 목록 가져오기
 */
async function getMarkdownFiles() {
  console.log('📡 GitHub에서 파일 목록 가져오는 중...');

  const branchUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}`;
  const branchRes = await axios.get(branchUrl, {
    headers: { 'User-Agent': 'FlutterChatbot/2.0' }
  });
  const commitSha = branchRes.data.commit.sha;

  const treeUrl = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${commitSha}?recursive=1`;
  const treeRes = await axios.get(treeUrl, {
    headers: { 'User-Agent': 'FlutterChatbot/2.0' }
  });

  const mdFiles = treeRes.data.tree.filter(item =>
    item.type === 'blob' &&
    item.path.endsWith('.md') &&
    item.path.startsWith(DOCS_PATH) &&
    !item.path.includes('_') && // _index.md 등 제외
    !item.path.includes('release-notes') // release notes 제외 (청크 너무 많음)
  );

  console.log(`✅ ${mdFiles.length}개 마크다운 파일 발견\n`);
  return mdFiles;
}

/**
 * 마크다운 파일 내용 가져오기
 */
async function fetchMarkdownContent(filePath) {
  const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${filePath}`;
  try {
    const res = await axios.get(url, { timeout: 10000 });
    return res.data;
  } catch (e) {
    return null;
  }
}

/**
 * 마크다운을 섹션 단위로 chunking
 * ## 또는 ### 헤딩을 기준으로 분할
 */
function chunkMarkdown(content, filePath) {
  // Front matter 제거
  const withoutFrontMatter = content.replace(/^---[\s\S]*?---\n*/m, '');

  // 섹션 분할 (## 또는 ### 기준)
  const sections = withoutFrontMatter.split(/(?=^#{2,3}\s)/m);

  const chunks = [];
  let docTitle = '';

  // 첫 번째 # 헤딩에서 문서 제목 추출
  const titleMatch = withoutFrontMatter.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    docTitle = titleMatch[1].trim();
  }

  for (const section of sections) {
    if (section.trim().length < 50) continue; // 너무 짧은 섹션 제외

    // 섹션 제목 추출
    const headingMatch = section.match(/^#{2,3}\s+(.+)$/m);
    const sectionTitle = headingMatch ? headingMatch[1].trim() : '';

    // 텍스트 정리
    const cleanText = section
      .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
      .replace(/`[^`]+`/g, '') // 인라인 코드 제거
      .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 → 텍스트
      .replace(/#{1,6}\s*/g, '') // 헤딩 마크 제거
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 볼드 제거
      .replace(/\*([^*]+)\*/g, '$1') // 이탤릭 제거
      .replace(/\s+/g, ' ') // 공백 정리
      .trim();

    if (cleanText.length < 100) continue; // 정리 후 너무 짧으면 제외

    // docs.flutter.dev URL 생성
    const docUrl = `https://docs.flutter.dev/${filePath
      .replace('src/content/', '')
      .replace('.md', '')
      .replace('/index', '')}`;

    chunks.push({
      title: sectionTitle || docTitle || filePath.split('/').pop().replace('.md', ''),
      docTitle: docTitle,
      content: cleanText.substring(0, 2000), // 2KB 제한
      url: docUrl,
      section: sectionTitle,
      filePath: filePath,
    });
  }

  return chunks;
}

/**
 * Gemini 임베딩 생성
 */
async function getEmbedding(text) {
  try {
    const res = await axios.post(
      `${GEMINI_EMBED_URL}?key=${GEMINI_API_KEY}`,
      {
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.substring(0, 8000) }] }
      },
      { timeout: 30000 }
    );
    return res.data.embedding.values;
  } catch (e) {
    console.error(`   ❌ 임베딩 실패: ${e.message}`);
    return null;
  }
}

/**
 * 벡터 ID 생성 (64 bytes 제한)
 */
function generateVectorId(chunk, index) {
  let id = `${chunk.filePath}_${index}`
    .replace(/[^a-zA-Z0-9]/g, '_');

  if (id.length > 64) {
    const hash = id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
    id = id.substring(0, 55) + '_' + hash;
  }
  return id;
}

/**
 * Vectorize에 벡터 저장
 */
async function saveVectors(vectors) {
  try {
    await axios.post(`${WORKER_URL}/api/sync-vectors`, { vectors }, { timeout: 60000 });
    return true;
  } catch (e) {
    console.error(`   ❌ 저장 실패: ${e.message}`);
    return false;
  }
}

/**
 * 메인 실행
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 Flutter 문서 RAG 파이프라인 - GitHub + Chunking');
  console.log('═'.repeat(60));
  console.log('');

  // 1. 파일 목록 가져오기
  const files = await getMarkdownFiles();
  if (files.length === 0) {
    console.error('❌ 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  // 2. 파일별로 처리
  let totalChunks = 0;
  let successCount = 0;
  let failCount = 0;

  console.log('📄 문서 처리 중...\n');

  if (START_INDEX > 0) {
    console.log(`⏩ ${START_INDEX}번 파일부터 재개\n`);
  }

  for (let i = START_INDEX; i < files.length; i++) {
    const file = files[i];

    console.log(`[${i + 1}/${files.length}] ${file.path.split('/').pop()}`);

    // 마크다운 가져오기
    const content = await fetchMarkdownContent(file.path);
    if (!content) {
      console.log('   ⏭️ 스킵 (내용 없음)');
      continue;
    }

    // 섹션 chunking
    const chunks = chunkMarkdown(content, file.path);
    totalChunks += chunks.length;
    console.log(`   📝 ${chunks.length}개 청크 생성`);

    // 각 chunk 임베딩 및 저장
    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];

      // 임베딩 생성
      const embedding = await getEmbedding(chunk.content);
      if (!embedding) {
        failCount++;
        continue;
      }

      // 벡터 저장
      const vector = {
        id: generateVectorId(chunk, j),
        values: embedding,
        metadata: {
          title: chunk.title.substring(0, 200),
          docTitle: chunk.docTitle?.substring(0, 100) || '',
          content: chunk.content,
          url: chunk.url,
          section: chunk.section?.substring(0, 100) || '',
          type: 'flutter-docs-chunk',
        },
      };

      const saved = await saveVectors([vector]);
      if (saved) {
        successCount++;
      } else {
        failCount++;
      }

      // Rate limit 대응 (분당 60 요청)
      await new Promise(r => setTimeout(r, 1200));
    }

    // 파일 간 딜레이
    await new Promise(r => setTimeout(r, 100));
  }

  // 3. 결과 출력
  console.log('\n' + '═'.repeat(60));
  console.log('📊 최종 결과:');
  console.log(`   📄 처리된 파일: ${files.length}개`);
  console.log(`   📝 생성된 청크: ${totalChunks}개`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ❌ 실패: ${failCount}개`);
  console.log(`   📈 성공률: ${((successCount / totalChunks) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
