// Resolve a trusted same-origin base URL for server-side fetches in App Router
// pages/route handlers. We rely on Next's `headers()` (populated by the
// framework/proxy, not raw client headers reachable in API handlers) plus
// platform/env hints. Never trust an arbitrary inbound `Host` header.

import { headers } from 'next/headers'

export async function getBaseUrl(): Promise<string> {
  // 1. Explicit env override (recommended in production).
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_INTERNAL_BASE_URL
  if (envUrl) return envUrl.replace(/\/+$/, '')

  // 2. Platform-provided hostnames.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`
  if (process.env.REPLIT_DEPLOYMENT_DOMAIN) return `https://${process.env.REPLIT_DEPLOYMENT_DOMAIN}`

  // 3. Trusted next/headers — populated by the framework/proxy layer.
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host')
    const proto = h.get('x-forwarded-proto') || 'https'
    if (host) return `${proto}://${host}`
  } catch { /* not in a request scope */ }

  // 4. Last-resort dev fallback.
  return 'http://localhost:5000'
}
