import { prefixMatch } from '@/lib/wordlist'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  if (q.length < 2) return Response.json({ suggestions: [] })
  return Response.json({ suggestions: prefixMatch(q, 5) })
}
