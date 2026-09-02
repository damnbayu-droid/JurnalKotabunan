'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Share2, Bookmark, BookmarkCheck, Heart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLang } from '@/lib/use-lang'

interface ArticleActionsProps {
  articleId: string
  slug: string
  title: string
  excerpt: string
  initialLikeCount: number
}

const BOOKMARKS_KEY = 'jurnalkotabunan_bookmarks'
const LIKES_KEY = 'jurnalkotabunan_likes'

const translations = {
  en: {
    share: 'Share',
    save: 'Save',
    saved: 'Saved',
    like: 'Like',
    liked: 'Liked',
    linkCopiedTitle: 'Link copied',
    linkCopiedDesc: 'Article link copied to clipboard.',
    copyFailedTitle: 'Failed to copy link',
    removedTitle: 'Removed from saved',
    savedTitle: 'Article saved',
    savedDesc: 'You can find it again in your browser history.',
  },
  id: {
    share: 'Bagikan',
    save: 'Simpan',
    saved: 'Tersimpan',
    like: 'Suka',
    liked: 'Disukai',
    linkCopiedTitle: 'Tautan disalin',
    linkCopiedDesc: 'Link artikel sudah disalin ke clipboard.',
    copyFailedTitle: 'Gagal menyalin tautan',
    removedTitle: 'Dihapus dari simpanan',
    savedTitle: 'Artikel disimpan',
    savedDesc: 'Bisa dilihat lagi lewat riwayat browser Anda.',
  },
}

function readBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeBookmarks(slugs: string[]) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(slugs))
  } catch {
    // localStorage unavailable (private mode, etc.) - saved state just won't persist
  }
}

// Same localStorage pattern as bookmarks - no reader accounts on this site,
// so "did I already like this" can only be tracked per-browser, not
// per-person. Not abuse-proof, but real, working engagement data instead
// of nothing (see src/app/api/articles/[id]/like/route.ts).
function readLikes(): string[] {
  try {
    const raw = localStorage.getItem(LIKES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLikes(ids: string[]) {
  try {
    localStorage.setItem(LIKES_KEY, JSON.stringify(ids))
  } catch {
    // localStorage unavailable - liked state just won't persist
  }
}

export function ArticleActions({ articleId, slug, title, excerpt, initialLikeCount }: ArticleActionsProps) {
  const { toast } = useToast()
  const [isSaved, setIsSaved] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const lang = useLang()
  const t = translations[lang]

  useEffect(() => {
    setIsSaved(readBookmarks().includes(slug))
    setIsLiked(readLikes().includes(articleId))
  }, [slug, articleId])

  const handleLike = async () => {
    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikeCount((c) => c + (nextLiked ? 1 : -1))

    const current = readLikes()
    writeLikes(nextLiked ? [...current, articleId] : current.filter((id) => id !== articleId))

    try {
      const res = await fetch(`/api/articles/${articleId}/like`, { method: nextLiked ? 'POST' : 'DELETE' })
      const data = await res.json()
      if (typeof data.likeCount === 'number') setLikeCount(data.likeCount)
    } catch {
      // Optimistic update stands even if the network call fails - not
      // worth showing an error toast for a "like", just let it drift and
      // resync on next page load.
    }
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: excerpt, url })
      } catch {
        // user cancelled the native share sheet - not an error
      }
      return
    }

    try {
      await navigator.clipboard.writeText(url)
      toast({ title: t.linkCopiedTitle, description: t.linkCopiedDesc })
    } catch {
      toast({ title: t.copyFailedTitle, variant: 'destructive' })
    }
  }

  const handleSave = () => {
    const current = readBookmarks()
    const next = isSaved ? current.filter((s) => s !== slug) : [...current, slug]
    writeBookmarks(next)
    setIsSaved(!isSaved)
    toast({
      title: isSaved ? t.removedTitle : t.savedTitle,
      description: isSaved ? undefined : t.savedDesc,
    })
  }

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      <Button variant="outline" size="sm" onClick={handleLike}>
        <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
        {isLiked ? t.liked : t.like} ({likeCount})
      </Button>
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="h-4 w-4 mr-2" />
        {t.share}
      </Button>
      <Button variant="outline" size="sm" onClick={handleSave}>
        {isSaved ? <BookmarkCheck className="h-4 w-4 mr-2" /> : <Bookmark className="h-4 w-4 mr-2" />}
        {isSaved ? t.saved : t.save}
      </Button>
    </div>
  )
}
