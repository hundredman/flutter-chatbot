// Vercel Serverless Function for Chat History
// 로컬 스토리지 기반으로 변경 (Vercel Postgres 불필요)

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 참고: 현재 프론트엔드에서 로컬 스토리지로 대화 기록 관리 중
  // 이 엔드포인트는 호환성을 위해 유지

  if (req.method === 'GET') {
    const { conversationId } = Object.fromEntries(new URL(req.url).searchParams);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Chat history is managed client-side with localStorage',
        conversationId,
        history: [],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}
