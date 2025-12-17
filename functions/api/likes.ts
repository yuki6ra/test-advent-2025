export type Env = {
  BLOG_LIKES_COUNTER: {  // 🌱KVの名前を入力
    get: (key: string) => Promise<string | null>
    put: (key: string, value: string) => Promise<void>
  }
}
/** CORS のための共通レスポンスヘッダ */
const CORS_HEADERS: Readonly<Record<string, string>> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
/**
 * エントリポイント: HTTP リクエストを受け取りメソッドに応じて処理する
 */
export const onRequest = async (context: {
  request: Request
  env: Env
}): Promise<Response> => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS, status: 204 })
  }
  const { request, env } = context
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug) {  // slug は必須
    return json({ error: 'slug クエリパラメータが必要です' }, 400)
  }
  try {
    switch (request.method) {
      case 'GET':
        return await handleGetLikes(slug, env)
      case 'POST':
        return await handlePostLikes(slug, env)
      default:
        return json({ error: '許可されていないメソッドです' }, 405)
    }
  } catch (error) {
    console.error('リクエスト処理中にエラーが発生しました:', error)
    return json({ error: 'サーバ内部でエラーが発生しました' }, 500)
  }
}
/**
 * GET: 現在のいいね数を取得して返却
 * KV に値がなければ 0 として扱う
 */
async function handleGetLikes(slug: string, env: Env): Promise<Response> {
  const likes = await getLikes(env, slug)
  return json({ likes }, 200)
}
/**
 * POST: いいね数を 1 増加して返却
 */
async function handlePostLikes(slug: string, env: Env): Promise<Response> {
  const current = await getLikes(env, slug)
  const next = current + 1
  await setLikes(env, slug, next)
  return json({ likes: next }, 200)
}
function getLikeKey(slug: string): string {
  return `likes:${slug}`
}
/**
 * KV からいいね数を取得
 */
async function getLikes(env: Env, slug: string): Promise<number> {
  const raw = await env.BLOG_LIKES_COUNTER.get(getLikeKey(slug))  // 🌱KVの名前を入力
  if (raw == null) return 0
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}
/**
 * KV にいいね数を保存
 */
async function setLikes(env: Env, slug: string, value: number): Promise<void> {
  await env.BLOG_LIKES_COUNTER.put(getLikeKey(slug), String(value))  // 🌱KVの名前を入力
}
/**
 * 共通の JSON レスポンス生成
 */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}