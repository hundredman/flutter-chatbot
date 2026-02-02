/**
 * Flutter 문서를 Cloudflare Vectorize에 동기화
 * GitHub Actions에서 실행 (100% 무료)
 */

import { Octokit } from '@octokit/rest';
import axios from 'axios';
import matter from 'gray-matter';
import fs from 'fs';

// 환경 변수
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const VECTORIZE_INDEX_NAME = 'flutter-docs';

// 로그 파일
const logFile = 'sync-log.txt';
const log = (message) => {
  console.log(message);
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
};

/**
 * 메인 동기화 함수
 */
async function syncFlutterDocs() {
  log('🚀 Starting Flutter docs sync to Cloudflare Vectorize...');

  try {
    // 1. GitHub 클라이언트 초기화
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    log('📚 Fetching file tree from flutter/website...');

    // 2. GitHub에서 파일 트리 가져오기
    const { data } = await octokit.git.getTree({
      owner: 'flutter',
      repo: 'website',
      tree_sha: 'main',
      recursive: true,
    });

    // 3. Markdown 파일 필터링
    const mdFiles = data.tree
      .filter(
        (file) =>
          file.path.startsWith('src') &&
          file.path.endsWith('.md') &&
          file.type === 'blob' &&
          !file.path.includes('_includes/')
      )
      .slice(0, 100); // GitHub Actions 시간 제한 고려

    log(`📄 Found ${mdFiles.length} markdown files to process`);

    // 4. 각 파일 처리 및 Vectorize에 업로드
    let processedCount = 0;
    let errorCount = 0;

    for (const file of mdFiles) {
      try {
        log(`Processing: ${file.path}`);

        // 파일 다운로드
        const content = await downloadFile(file.path);

        // Frontmatter 파싱
        const { data: frontmatter, content: markdown } = matter(content);

        // 텍스트 청킹
        const chunks = chunkText(markdown, 1200, 200);

        log(`  └─ Created ${chunks.length} chunks`);

        // 각 청크 처리
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          // Cloudflare Workers AI로 임베딩 생성 (무료)
          const embedding = await generateEmbedding(chunk);

          // Vectorize에 업로드
          await uploadToVectorize({
            id: `${file.path.replace(/[^a-zA-Z0-9-_]/g, '_')}_chunk_${i}`,
            values: embedding,
            metadata: {
              title: frontmatter.title || file.path.split('/').pop(),
              content: chunk.substring(0, 5000), // 메타데이터 크기 제한
              url: `https://docs.flutter.dev/${file.path.replace('src/', '').replace('.md', '')}`,
              githubPath: file.path,
              section: frontmatter.category || 'General',
              type: classifyContent(file.path),
              lastUpdated: new Date().toISOString(),
            },
          });

          // Rate limit 준수
          await sleep(100); // Cloudflare는 빠름
        }

        processedCount++;
        log(`✅ Completed: ${file.path} (${processedCount}/${mdFiles.length})`);
      } catch (error) {
        errorCount++;
        log(`❌ Error processing ${file.path}: ${error.message}`);
      }
    }

    log('');
    log('🎉 Sync completed!');
    log(`📊 Statistics:`);
    log(`   - Total files: ${mdFiles.length}`);
    log(`   - Processed: ${processedCount}`);
    log(`   - Errors: ${errorCount}`);
    log(`   - Success rate: ${((processedCount / mdFiles.length) * 100).toFixed(1)}%`);
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
}

/**
 * GitHub에서 파일 다운로드
 */
async function downloadFile(path) {
  const url = `https://raw.githubusercontent.com/flutter/website/main/${path}`;
  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Flutter-Chatbot-Sync/2.0',
    },
  });
  return data;
}

/**
 * Cloudflare Workers AI로 임베딩 생성 (무료)
 */
async function generateEmbedding(text) {
  try {
    const truncatedText = text.substring(0, 512).trim();

    if (!truncatedText) {
      throw new Error('Empty text after truncation');
    }

    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-base-en-v1.5`,
      {
        text: truncatedText,
      },
      {
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    // 응답 구조 검증
    if (!response.data || !response.data.result) {
      throw new Error(`Invalid API response structure`);
    }

    // Workers AI 응답 구조: { result: { data: [[embedding_array]] } }
    const embedding = response.data.result.data[0];

    // 임베딩이 배열인지 확인
    if (!Array.isArray(embedding)) {
      throw new Error(`Invalid embedding format: ${typeof embedding}`);
    }

    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimension: ${embedding.length}, expected 768`);
    }

    return embedding;
  } catch (error) {
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

/**
 * Cloudflare Vectorize에 업로드
 */
async function uploadToVectorize(vector) {
  await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX_NAME}/insert`,
    {
      vectors: [vector],
    },
    {
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
}

/**
 * 텍스트 청킹
 */
function chunkText(text, maxLength = 1200, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks.filter((chunk) => chunk.trim().length > 100);
}

/**
 * 콘텐츠 타입 분류
 */
function classifyContent(path) {
  const pathLower = path.toLowerCase();

  if (pathLower.includes('tutorial') || pathLower.includes('codelab')) {
    return 'tutorial';
  }
  if (pathLower.includes('cookbook') || pathLower.includes('example')) {
    return 'cookbook';
  }
  if (pathLower.includes('api') || pathLower.includes('reference')) {
    return 'api';
  }
  if (pathLower.includes('get-started') || pathLower.includes('install')) {
    return 'guide';
  }

  return 'general';
}

/**
 * Sleep 유틸리티
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 실행
syncFlutterDocs().catch((error) => {
  log(`💥 Unhandled error: ${error.message}`);
  process.exit(1);
});
