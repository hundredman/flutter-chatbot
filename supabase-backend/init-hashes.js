/**
 * 기존 문서들의 GitHub SHA 해시를 sync_metadata에 등록
 * 최초 1회만 실행 (이미 임베딩된 문서들의 해시 저장)
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'flutter';
const REPO_NAME = 'website';
const BRANCH = 'main';
const DOCS_PATH = 'src/content';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 필요: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
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

  console.log(`✅ ${mdFiles.length}개 파일 발견\n`);
  console.log('📋 SHA 해시 등록 중...');

  let count = 0;
  let errors = [];
  for (const file of mdFiles) {
    const { error } = await supabase
      .from('sync_metadata')
      .upsert({
        file_path: file.path,
        github_sha: file.sha,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'file_path' });

    if (error) {
      errors.push(error.message);
    } else {
      count++;
    }
  }

  if (errors.length > 0) {
    console.log(`\n❌ 에러 발생: ${errors[0]}`);
  }

  console.log(`\n✅ ${count}개 파일의 SHA 해시 등록 완료`);
  console.log('이제 npm run sync 실행 시 변경된 파일만 업데이트됩니다.');
}

main().catch(console.error);
