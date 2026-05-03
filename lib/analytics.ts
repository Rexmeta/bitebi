// Lightweight client-side event helper for GA4 (gtag) or any global tracker.
// All events are no-ops if no tracker is present, so this is safe in dev.

type EventName =
  | 'mt_kpi_card_click'
  | 'mt_metric_page_view'
  | 'mt_watchlist_add'
  | 'mt_watchlist_alert_set'
  | 'mt_compare_render'
  | 'mt_embed_view'
  | 'mt_export_click'

interface AnalyticsParams { [k: string]: string | number | boolean | null | undefined }

export function trackEvent(name: EventName, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined') return
  // GA4 / gtag.js
  const w = window as any
  if (typeof w.gtag === 'function') {
    try { w.gtag('event', name, params) } catch { /* ignore */ }
  }
  // dataLayer push (GTM)
  if (Array.isArray(w.dataLayer)) {
    try { w.dataLayer.push({ event: name, ...params }) } catch { /* ignore */ }
  }
  // dev breadcrumb
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', name, params)
  }
}
