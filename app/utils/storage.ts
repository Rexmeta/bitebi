const BOOKMARK_KEY = 'bitebi_bookmarks'

export const storage = {
  getBookmarks: (): string[] => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(BOOKMARK_KEY)
    return saved ? JSON.parse(saved) : []
  },

  saveBookmark: (id: string): void => {
    if (typeof window === 'undefined') return
    const bookmarks = storage.getBookmarks()
    if (!bookmarks.includes(id)) {
      localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...bookmarks, id]))
    }
  },

  removeBookmark: (id: string): void => {
    if (typeof window === 'undefined') return
    const bookmarks = storage.getBookmarks()
    localStorage.setItem(
      BOOKMARK_KEY,
      JSON.stringify(bookmarks.filter(bookmark => bookmark !== id))
    )
  }
} 