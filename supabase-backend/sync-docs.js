/**
 * Flutter 문서 증분 동기화 - Supabase + Gemini
 * GitHub SHA 해시를 비교해서 변경된 문서만 업데이트
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'flutter';
const REPO_NAME = 'website';
const BRANCH = 'main';
const DOCS_PATH = 'sites/docs/src/content';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 전체 동기화 모드 (--full 플래그)
const FULL_SYNC = process.argv.includes('--full');

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Supabase에서 저장된 파일 SHA 해시 가져오기
 */
async function getSavedFileHashes() {
  const { data, error } = await supabase
    .from('sync_metadata')
    .select('file_path, github_sha');

  if (error) {
    // 테이블이 없으면 빈 맵 반환
    console.log('📋 sync_metadata 테이블이 없습니다. 전체 동기화를 실행합니다.');
    return new Map();
  }

  const hashMap = new Map();
  for (const row of data || []) {
    hashMap.set(row.file_path, row.github_sha);
  }
  return hashMap;
}

/**
 * 파일 SHA 해시 저장
 */
async function saveFileHash(filePath, sha) {
  await supabase
    .from('sync_metadata')
    .upsert({
      file_path: filePath,
      github_sha: sha,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'file_path' });
}

/**
 * 삭제된 파일의 벡터 제거
 */
async function removeDeletedFiles(currentFiles, savedHashes) {
  const currentPaths = new Set(currentFiles.map(f => f.path));
  const deletedPaths = [];

  for (const [path] of savedHashes) {
    if (!currentPaths.has(path)) {
      deletedPaths.push(path);
    }
  }

  if (deletedPaths.length > 0) {
    console.log(`🗑️ ${deletedPaths.length}개 삭제된 파일 정리 중...`);

    for (const path of deletedPaths) {
      // 해당 파일의 모든 청크 삭제
      await supabase
        .from('documents')
        .delete()
        .like('id', `${path.replace(/[^a-zA-Z0-9]/g, '_')}%`);

      // 메타데이터 삭제
      await supabase
        .from('sync_metadata')
        .delete()
        .eq('file_path', path);
    }
  }

  return deletedPaths.length;
}

/**
 * GitHub에서 마크다운 파일 목록 가져오기
 */
async function getMarkdownFiles() {
  console.log('📡 GitHub에서 파일 목록 가져오는 중...');

  const branchRes = await axios.get(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH}`,
    { headers: { 'User-Agent': 'FlutterChatbot/2.0' } }
  );
  const commitSha = branchRes.data.commit.sha;

  const treeRes = await axios.get(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${commitSha}?recursive=1`,
    { headers: { 'User-Agent': 'FlutterChatbot/2.0' } }
  );

  const mdFiles = treeRes.data.tree.filter(item =>
    item.type === 'blob' &&
    item.path.endsWith('.md') &&
    item.path.startsWith(DOCS_PATH) &&
    !item.path.includes('_') &&
    !item.path.includes('release-notes')
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
 */
function chunkMarkdown(content, filePath) {
  const withoutFrontMatter = content.replace(/^---[\s\S]*?---\n*/m, '');
  const sections = withoutFrontMatter.split(/(?=^#{2,3}\s)/m);

  const chunks = [];
  let docTitle = '';

  const titleMatch = withoutFrontMatter.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    docTitle = titleMatch[1].trim();
  }

  for (const section of sections) {
    if (section.trim().length < 50) continue;

    const headingMatch = section.match(/^#{2,3}\s+(.+)$/m);
    const sectionTitle = headingMatch ? headingMatch[1].trim() : '';

    const cleanText = section
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText.length < 100) continue;

    const docUrl = `https://docs.flutter.dev/${filePath
      .replace('sites/docs/src/content/', '')
      .replace('.md', '')
      .replace('/index', '')}`;

    chunks.push({
      title: sectionTitle || docTitle || filePath.split('/').pop().replace('.md', ''),
      content: cleanText.substring(0, 2000),
      url: docUrl,
      filePath,
    });
  }

  return chunks;
}

/**
 * Gemini 배치 임베딩 생성 (최대 100개 텍스트를 한 번의 API 호출로 처리)
 */
async function getBatchEmbeddings(texts, retries = 3) {
  const requests = texts.map(text => ({
    model: 'models/gemini-embedding-001',
    content: { parts: [{ text: text.substring(0, 8000) }] },
    outputDimensionality: 768
  }));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${GEMINI_API_KEY}`,
        { requests },
        { timeout: 60000 }
      );
      return res.data.embeddings.map(e => e.values);
    } catch (e) {
      if (e.response?.status === 429 || e.response?.status === 503) {
        const wait = attempt * 5000;
        console.warn(`   ⚠️ rate limit (${e.response.status}), ${wait/1000}s 후 재시도... (${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.error(`   ❌ 배치 임베딩 실패: ${e.message}`);
        return null;
      }
    }
  }
  console.error(`   ❌ 배치 임베딩 실패: 재시도 ${retries}회 초과`);
  return null;
}

/**
 * 벡터 ID 생성
 */
function generateVectorId(chunk, index) {
  let id = `${chunk.filePath}_${index}`.replace(/[^a-zA-Z0-9]/g, '_');
  if (id.length > 64) {
    const hash = id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(36);
    id = id.substring(0, 55) + '_' + hash;
  }
  return id;
}

/**
 * 파일의 기존 청크 삭제
 */
async function deleteFileChunks(filePath) {
  const idPrefix = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  await supabase
    .from('documents')
    .delete()
    .like('id', `${idPrefix}%`);
}

/**
 * Supabase에 벡터 저장
 */
async function saveToSupabase(id, embedding, metadata) {
  const { error } = await supabase
    .from('documents')
    .upsert({
      id,
      embedding,
      title: metadata.title,
      content: metadata.content,
      url: metadata.url,
      doc_type: 'flutter-docs-chunk',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  return !error;
}

/**
 * 메인 실행
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 Flutter 문서 → Supabase pgvector 증분 동기화');
  console.log(FULL_SYNC ? '   (전체 동기화 모드)' : '   (증분 동기화 모드)');
  console.log('═'.repeat(60));
  console.log('');

  // 1. GitHub에서 현재 파일 목록 가져오기
  const files = await getMarkdownFiles();
  if (files.length === 0) {
    console.error('❌ 파일을 찾을 수 없습니다.');
    process.exit(1);
  }

  // 2. 저장된 SHA 해시 가져오기
  const savedHashes = FULL_SYNC ? new Map() : await getSavedFileHashes();
  console.log(`📋 저장된 파일 해시: ${savedHashes.size}개\n`);

  // 3. 삭제된 파일 정리
  const deletedCount = await removeDeletedFiles(files, savedHashes);

  // 4. 변경된 파일만 필터링
  const changedFiles = files.filter(file => {
    const savedSha = savedHashes.get(file.path);
    return !savedSha || savedSha !== file.sha;
  });

  console.log(`🔄 변경된 파일: ${changedFiles.length}개 (전체 ${files.length}개 중)`);
  if (deletedCount > 0) {
    console.log(`🗑️ 삭제된 파일: ${deletedCount}개`);
  }
  console.log('');

  if (changedFiles.length === 0) {
    console.log('✅ 모든 문서가 최신 상태입니다!');
    console.log('═'.repeat(60));
    return;
  }

  // 5. 변경된 파일만 처리
  // 전략: 파일 20개 동시 fetch → 청크 100개씩 batchEmbedContents → Supabase upsert 병렬
  let totalChunks = 0;
  let successCount = 0;
  let failCount = 0;

  console.log('📄 변경된 문서 처리 중...\n');

  const BATCH_SIZE = 100; // Gemini batchEmbedContents 최대 100개
  let doneCount = 0;

  // 1단계: 모든 파일 내용 병렬 fetch + 청크 생성
  console.log('📥 파일 내용 병렬 fetch 중...');
  const fetchLimit = pLimit(20);
  const fileChunks = await Promise.all(changedFiles.map((file) => fetchLimit(async () => {
    const content = await fetchMarkdownContent(file.path);
    if (!content) return { file, chunks: [] };
    await deleteFileChunks(file.path);
    return { file, chunks: chunkMarkdown(content, file.path) };
  })));

  // 2단계: 전체 청크를 모아서 100개씩 배치 임베딩 (순차 처리로 rate limit 방지)
  console.log('🔢 배치 임베딩 처리 중...\n');
  const allChunks = fileChunks.flatMap(({ file, chunks }) =>
    chunks.map(chunk => ({ file, chunk }))
  );

  const allEmbeddings = [];
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const embeddings = await getBatchEmbeddings(batch.map(c => c.chunk.content));
    if (embeddings) {
      allEmbeddings.push(...embeddings);
    } else {
      allEmbeddings.push(...new Array(batch.length).fill(null));
    }
    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= allChunks.length) {
      console.log(`   임베딩 진행: ${Math.min(i + BATCH_SIZE, allChunks.length)}/${allChunks.length}청크`);
    }
  }

  // 3단계: Supabase upsert 병렬 처리
  console.log('\n💾 Supabase 저장 중...');
  const upsertLimit = pLimit(20);
  const fileSuccessMap = new Map(fileChunks.map(({ file }) => [file.path, true]));

  await Promise.all(allChunks.map((item, idx) => upsertLimit(async () => {
    const embedding = allEmbeddings[idx];
    totalChunks++;
    if (!embedding) {
      failCount++;
      fileSuccessMap.set(item.file.path, false);
      return;
    }
    const id = generateVectorId(item.chunk, idx);
    const saved = await saveToSupabase(id, embedding, item.chunk);
    if (saved) successCount++;
    else { failCount++; fileSuccessMap.set(item.file.path, false); }
  })));

  // 성공한 파일만 SHA 저장
  await Promise.all(fileChunks.map(({ file, chunks }) =>
    fileSuccessMap.get(file.path) && chunks.length > 0
      ? saveFileHash(file.path, file.sha)
      : Promise.resolve()
  ));

  const successRate = totalChunks > 0 ? (successCount / totalChunks) * 100 : 100;

  console.log('\n' + '═'.repeat(60));
  console.log('📊 동기화 결과:');
  console.log(`   🔄 처리된 파일: ${changedFiles.length}개`);
  console.log(`   📝 생성된 청크: ${totalChunks}개`);
  console.log(`   ✅ 성공: ${successCount}개`);
  console.log(`   ❌ 실패: ${failCount}개`);
  if (totalChunks > 0) {
    console.log(`   📈 성공률: ${successRate.toFixed(1)}%`);
  }
  console.log('═'.repeat(60));

  // 성공률 50% 미만이면 실패로 처리
  if (totalChunks > 0 && successRate < 50) {
    console.error(`\n❌ 동기화 실패: 성공률 ${successRate.toFixed(1)}% (기준: 50% 이상)`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ 동기화 중 치명적 오류:', err.message);
  process.exit(1);
});
