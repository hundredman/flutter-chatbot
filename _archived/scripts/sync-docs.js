// GitHub Actions로 Flutter 문서를 Pinecone에 동기화
// 완전 무료: GitHub Actions + Pinecone + Hugging Face

const { Octokit } = require('@octokit/rest');
const { Pinecone } = require('@pinecone-database/pinecone');
const axios = require('axios');
const matter = require('gray-matter');
const fs = require('fs');

// 로그 파일 생성
const logFile = 'sync-log.txt';
const log = (message) => {
  console.log(message);
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
};

async function syncFlutterDocs() {
  log('🔄 Starting Flutter docs sync to Pinecone...');

  try {
    // 1. GitHub 클라이언트 초기화
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    log('📚 Fetching file tree from flutter/website...');

    // 2. GitHub에서 파일 트리 가져오기
    const { data } = await octokit.git.getTree({
      owner: 'flutter',
      repo: 'website',
      tree_sha: 'main',
      recursive: true,
    });

    // 3. Markdown 파일만 필터링
    const mdFiles = data.tree
      .filter(file =>
        file.path.startsWith('src') &&
        file.path.endsWith('.md') &&
        file.type === 'blob' &&
        !file.path.includes('_includes/') // includes 제외
      )
      .slice(0, 100); // GitHub Actions 시간 제한 고려 (처음 100개만)

    log(`📄 Found ${mdFiles.length} markdown files to process`);

    // 4. Pinecone 초기화
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = 'flutter-docs';

    // 인덱스 존재 확인
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (!indexExists) {
      log(`📦 Creating Pinecone index: ${indexName}...`);
      await pc.createIndex({
        name: indexName,
        dimension: 384, // Hugging Face all-MiniLM-L6-v2 모델 차원
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      log('✅ Index created, waiting for initialization...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1분 대기
    }

    const index = pc.index(indexName);

    // 5. 각 파일 처리
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

          // Hugging Face로 임베딩 생성
          const embedding = await generateEmbedding(chunk);

          // Pinecone에 업로드
          await index.upsert([{
            id: `${file.path.replace(/[^a-zA-Z0-9-_]/g, '_')}_chunk_${i}`,
            values: embedding,
            metadata: {
              title: frontmatter.title || file.path.split('/').pop(),
              content: chunk.substring(0, 10000), // Pinecone 메타데이터 제한
              url: `https://docs.flutter.dev/${file.path.replace('src/', '').replace('.md', '')}`,
              githubPath: file.path,
              section: frontmatter.category || 'General',
              type: classifyContent(file.path),
              lastUpdated: new Date().toISOString(),
            },
          }]);

          // Rate limit 준수 (HuggingFace: 초당 1 request)
          await new Promise(resolve => setTimeout(resolve, 1100));
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

// GitHub에서 파일 다운로드
async function downloadFile(path) {
  const url = `https://raw.githubusercontent.com/flutter/website/main/${path}`;
  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Flutter-Chatbot-Sync/1.0',
    },
  });
  return data;
}

// Hugging Face로 임베딩 생성 (무료)
async function generateEmbedding(text) {
  const response = await axios.post(
    'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
    {
      inputs: text.substring(0, 512), // 모델 최대 길이 제한
      options: { wait_for_model: true },
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data;
}

// 텍스트 청킹
function chunkText(text, maxLength = 1200, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks.filter(chunk => chunk.trim().length > 100); // 너무 짧은 청크 제거
}

// 콘텐츠 타입 분류
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

// 실행
syncFlutterDocs().catch(error => {
  log(`💥 Unhandled error: ${error.message}`);
  process.exit(1);
});
