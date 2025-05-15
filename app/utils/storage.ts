export const storage = {
  getBookmarks: (): string[] => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('bookmarks')
    return saved ? JSON.parse(saved) : []
  },

  saveBookmark: (postId: string) => {
    if (typeof window === 'undefined') return
    const bookmarks = storage.getBookmarks()
    if (!bookmarks.includes(postId)) {
      bookmarks.push(postId)
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
    }
  },

  removeBookmark: (postId: string) => {
    if (typeof window === 'undefined') return
    const bookmarks = storage.getBookmarks()
    const updated = bookmarks.filter(id => id !== postId)
    localStorage.setItem('bookmarks', JSON.stringify(updated))
  }
} 