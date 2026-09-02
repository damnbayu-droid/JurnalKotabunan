'use client'
// Force Rebuild
import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AD_POSITIONS } from '@/lib/ads/positions'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AsyncButton } from '@/components/ui/async-button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  MessageCircle,
  Shield,
  ShieldAlert,
  KeyRound,
  IdCard,
  BarChart3,
  Settings,
  Search,
  Send,
  Save,
  Link as LinkIcon,
  Image as ImageIcon,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Brain,
  Zap,
  Activity,
  RefreshCw,
  List,
  Megaphone,
  Upload,
  Users2,
  Receipt,
  DollarSign,
  Copy,
  CopyCheck,
  TrendingUp,
  RotateCcw,
  Heart,
  Share2,
  Mail,
  Archive
} from 'lucide-react'
import Image from 'next/image'
import { AiControls } from '@/components/admin/ai-controls'
import { AdminChatWidget } from '@/components/admin/chat-widget'
import { AgentStatusCard } from '@/components/admin/agent-status-card'
import { SystemHealthCard } from '@/components/admin/system-health-card'
import { ScheduleCard } from '@/components/admin/schedule-card'
import { ImageCropDialog } from '@/components/admin/image-crop-dialog'

interface NavItem {
  value: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Utama',
    items: [
      { value: 'overview', label: 'Overview', icon: LayoutDashboard },
      { value: 'metrics', label: 'Metrics', icon: TrendingUp },
    ],
  },
  {
    label: 'Konten',
    items: [
      { value: 'listnews', label: 'List News', icon: List },
      { value: 'articles', label: 'Articles', icon: FileText },
      { value: 'trash', label: 'Trash', icon: Trash2 },
      { value: 'comments', label: 'Comments', icon: MessageCircle },
      { value: 'email', label: 'Email', icon: Mail },
    ],
  },
  {
    label: 'Manajemen',
    items: [
      { value: 'users', label: 'Users', icon: Users },
      { value: 'team', label: 'Team (Redaksi)', icon: IdCard },
      { value: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Monetisasi',
    items: [
      { value: 'ads', label: 'Ads', icon: Megaphone },
      { value: 'pricing', label: 'Pricing', icon: DollarSign },
      { value: 'advertisers', label: 'Advertisers', icon: Users2 },
      { value: 'invoices', label: 'Invoices', icon: Receipt },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { value: 'ai', label: 'AI Center', icon: Brain },
      { value: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

const categories = [
  { value: 'GOVERNMENT', label: 'Pemerintahan' },
  { value: 'TOURISM', label: 'Pariwisata' },
  { value: 'INVESTMENT', label: 'Investasi' },
  { value: 'INCIDENTS', label: 'Insiden' },
  { value: 'ENVIRONMENT', label: 'Lingkungan Hidup' },
  { value: 'PANANG', label: 'Panang' },
  { value: 'INTERNATIONAL', label: 'Internasional' },
  { value: 'TECHNOLOGY', label: 'Teknologi' },
  { value: 'OPINION', label: 'Opini' },
]

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  REVIEW: 'secondary',
  PUBLISHED: 'default',
  REJECTED: 'destructive',
  PENDING: 'secondary',
  APPROVED: 'default',
  FLAGGED: 'destructive',
}

const roleColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ADMIN: 'default',
  EDITOR: 'secondary',
  USER: 'outline',
}

const riskColors: Record<string, string> = {
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
}

interface AdSlotRow {
  id: string
  name: string
  position: string
  device: string
  width: number
  height: number
  pricePerDay: number | null
  defaultDurationDays: number
  ads: { id: string; isActive: boolean }[]
}

interface TeamMemberRow {
  id: string
  name: string
  role: string
  bio: string | null
  photoUrl: string | null
  order: number
  isActive: boolean
}

interface AdvertiserRow {
  id: string
  companyName: string
  phone: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason: string | null
  user: { email: string; name: string | null }
}

interface InvoiceRow {
  id: string
  invoiceNumber: string
  amount: number
  status: 'UNPAID' | 'VERIFYING' | 'PAID' | 'REJECTED'
  proofUrl: string | null
  rejectionReason: string | null
  advertiser: { companyName: string; user: { email: string } }
  ad: { slot: { name: string } }
}

interface CompanySettingsData {
  companyName: string
  address: string
  npwp: string
  phone: string
  bankName: string
  bankAccountNo: string
  bankAccountName: string
}

interface AdRow {
  id: string
  slotId: string
  slot: AdSlotRow
  advertiserId: string | null
  advertiserName: string
  mediaUrl: string
  mediaType: 'IMAGE' | 'VIDEO'
  linkUrl: string | null
  startDate: string
  endDate: string
  isActive: boolean
  invoice: { id: string; invoiceNumber: string; amount: number; status: string } | null
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  imageSource: string | null
  aiAssisted: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  containsAccusation: boolean
  verificationLevel: string
  evidenceCount: number
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'REJECTED' | 'SCHEDULED' | 'TRASHED'
  viewCount: number
  likeCount?: number
  shareCount?: number
  deletedAt?: string | null
  createdAt: string
  publishedAt: string | null
  author: { name: string | null, email: string }
}

interface MetricsArticle {
  id: string
  title: string
  slug: string
  category: string
  viewCount: number
  likeCount: number
  shareCount: number
  publishedAt: string | null
  _count: { comments: number }
}

interface MetricsData {
  topViewed: MetricsArticle[]
  topLiked: MetricsArticle[]
  topShared: MetricsArticle[]
  topCommented: MetricsArticle[]
  topSearched: { query: string; count: number }[]
  totals: { views: number; likes: number; shares: number; searches: number }
}

interface AgentMemoryItem {
  id: string
  agentKey: string
  category: string | null
  content: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

interface ContactSubmissionItem {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'UNREAD' | 'READ' | 'ARCHIVED' | 'REPLIED'
  replyMessage: string | null
  repliedBy: string | null
  repliedAt: string | null
  createdAt: string
}

interface Report {
  id: string
  title: string
  category: string
  content: string
  sourceContact: string | null
  evidenceLinks: string | null
  status: string
  createdAt: string
}



interface Comment {
  id: string
  content: string
  status: string
  toxicityScore: number | null
  createdAt: string
  user: { name: string | null; email: string }
  article: { title: string }
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  _count?: { articles: number; comments: number }
}

export default function MasterAdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  // Data states
  const [articles, setArticles] = useState<Article[]>([])
  const [listNewsSearch, setListNewsSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function formatArticleForCopy(a: { category: string; title: string; excerpt: string }): string {
    return `Kategori: ${a.category}\nJudul: ${a.title}\nRingkasan: ${a.excerpt}`
  }

  async function handleCopyArticle(a: { id: string; category: string; title: string; excerpt: string }) {
    try {
      await navigator.clipboard.writeText(formatArticleForCopy(a))
      setCopiedId(a.id)
      setTimeout(() => setCopiedId((current) => (current === a.id ? null : current)), 1500)
    } catch {
      setError('Gagal menyalin ke clipboard')
    }
  }

  async function handleCopyAllArticles(list: { id: string; category: string; title: string; excerpt: string }[]) {
    if (list.length === 0) return
    try {
      await navigator.clipboard.writeText(list.map(formatArticleForCopy).join('\n\n'))
      setCopiedId('all')
      setSuccess(`${list.length} berita disalin ke clipboard!`)
      setTimeout(() => setCopiedId((current) => (current === 'all' ? null : current)), 1500)
    } catch {
      setError('Gagal menyalin ke clipboard')
    }
  }
  const [reports, setReports] = useState<Report[]>([])
  const [viewingReport, setViewingReport] = useState<Report | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    totalUsers: 0,
    totalComments: 0,
    pendingComments: 0,
    highRiskArticles: 0,
    byStatus: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byRole: {} as Record<string, number>,
  })

  // Articles tab: lazy-loaded one calendar month at a time (instead of every
  // article ever created) - `articles` above stays for List News, which
  // genuinely wants everything for its copy-all feature and is fetched
  // separately, only once that tab is actually opened (see the effect near
  // the bottom of this file).
  const [monthlyArticles, setMonthlyArticles] = useState<Article[]>([])
  const [articlesCursor, setArticlesCursor] = useState<string | undefined>(undefined)
  const [articlesHasMore, setArticlesHasMore] = useState(true)
  const [articlesLoadingMore, setArticlesLoadingMore] = useState(false)
  const [articlesTabLoaded, setArticlesTabLoaded] = useState(false)
  const [listNewsLoaded, setListNewsLoaded] = useState(false)
  const [searchResults, setSearchResults] = useState<Article[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [highRiskList, setHighRiskList] = useState<Article[] | null>(null)
  const [highRiskLoading, setHighRiskLoading] = useState(false)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [trashList, setTrashList] = useState<Article[] | null>(null)
  const [trashLoading, setTrashLoading] = useState(false)
  const [agentMemories, setAgentMemories] = useState<AgentMemoryItem[] | null>(null)
  const [agentMemoriesTotal, setAgentMemoriesTotal] = useState(0)
  const [agentMemoriesByAgent, setAgentMemoriesByAgent] = useState<{ agentKey: string; count: number }[]>([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [memoryAgentFilter, setMemoryAgentFilter] = useState<string>('all')
  const [memorySearch, setMemorySearch] = useState('')
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionItem[] | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmissionItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  // Articles tab sub-view: 'all' is the month-paginated table, 'risk' is a
  // flat list of every HIGH/CRITICAL article regardless of which month it's
  // in - reuses the same on-demand fetch the Overview "High Risk Articles"
  // popup already uses, so switching to this view is instant on a repeat visit.
  const [articlesView, setArticlesView] = useState<'all' | 'risk'>('all')

  // UI states
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  // Kept as functions (not state) so the ~50 existing setError()/setSuccess()
  // call sites across this file didn't need touching - they now surface as
  // global top-center toasts instead of an inline banner that could scroll
  // out of view.
  function setError(message: string | null) {
    if (message) toast({ title: 'Gagal', description: message, variant: 'destructive' })
  }
  function setSuccess(message: string | null) {
    if (message) toast({ title: 'Berhasil', description: message })
  }
  // Shared submit-loading flag for the ad slot/ad create/update dialogs -
  // only one of these dialogs can be open at a time, so one flag is enough.
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Article form state
  const [articleForm, setArticleForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    featuredImageUrl: '',
    featuredImageAlt: '',
    imageSource: '',
    status: 'DRAFT',
  })
  // Once the admin manually edits the slug, stop auto-deriving it from the
  // title (standard "slug follows title until touched" pattern).
  const [slugTouched, setSlugTouched] = useState(false)
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false)
  // File picked from "Upload Gambar dari Komputer" waiting to be cropped to
  // 16:9 before it's actually uploaded - see ImageCropDialog.
  const [pendingFeaturedImageFile, setPendingFeaturedImageFile] = useState<File | null>(null)
  const [statDialog, setStatDialog] = useState<'articles' | 'comments' | 'risk' | 'users' | null>(null)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [showArticleDialog, setShowArticleDialog] = useState(false)
  const [analyzingRisk, setAnalyzingRisk] = useState(false)
  const [riskAnalysis, setRiskAnalysis] = useState<{
    riskScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    containsAccusation: boolean
    recommendations: string[]
    requiresLegalReview: boolean
  } | null>(null)

  // Photo upload state (article edit dialog)
  const [uploadingSlot, setUploadingSlot] = useState<'top' | 'middle' | 'bottom' | null>(null)

  // Ads panel state
  const [adSlots, setAdSlots] = useState<AdSlotRow[]>([])
  const [ads, setAds] = useState<AdRow[]>([])
  const [showAdSlotDialog, setShowAdSlotDialog] = useState(false)
  const [showAdDialog, setShowAdDialog] = useState(false)
  const [adSlotForm, setAdSlotForm] = useState({ name: '', position: 'HEADER', device: 'DESKTOP', width: 728, height: 90, pricePerDay: '', defaultDurationDays: '7' })
  const [pricingEdits, setPricingEdits] = useState<Record<string, { pricePerDay: string; defaultDurationDays: string }>>({})
  const [savingPricingId, setSavingPricingId] = useState<string | null>(null)
  const [adForm, setAdForm] = useState({ slotId: '', advertiserId: '', advertiserName: '', linkUrl: '', startDate: '', endDate: '', invoiceAmount: '' })
  const [adFile, setAdFile] = useState<File | null>(null)
  const [adsLoading, setAdsLoading] = useState(false)
  const [approvedAdvertisers, setApprovedAdvertisers] = useState<AdvertiserRow[]>([])

  async function fetchAdsData() {
    setAdsLoading(true)
    try {
      const [slotsRes, adsRes, advertisersRes] = await Promise.all([
        fetch('/api/admin/ad-slots'),
        fetch('/api/admin/ads'),
        fetch('/api/admin/advertisers?status=APPROVED'),
      ])
      const slotsData = slotsRes.ok ? await slotsRes.json() : { slots: [] }
      const adsData = adsRes.ok ? await adsRes.json() : { ads: [] }
      const advertisersData = advertisersRes.ok ? await advertisersRes.json() : { advertisers: [] }
      if (Array.isArray(slotsData.slots)) setAdSlots(slotsData.slots)
      if (Array.isArray(adsData.ads)) setAds(adsData.ads)
      if (Array.isArray(advertisersData.advertisers)) setApprovedAdvertisers(advertisersData.advertisers)
    } catch (err) {
      console.error('Error fetching ads data:', err)
    } finally {
      setAdsLoading(false)
    }
  }

  useEffect(() => {
    if ((activeTab === 'ads' || activeTab === 'pricing') && adSlots.length === 0 && ads.length === 0) {
      fetchAdsData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function handleCreateAdSlot(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFormSubmitting(true)
    try {
      const res = await fetch('/api/admin/ad-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adSlotForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create ad slot')
      setSuccess('Ad slot created!')
      setShowAdSlotDialog(false)
      setAdSlotForm({ name: '', position: 'HEADER', device: 'DESKTOP', width: 728, height: 90, pricePerDay: '', defaultDurationDays: '7' })
      fetchAdsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad slot')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeleteAdSlot(id: string) {
    if (!confirm('Hapus slot iklan ini? Semua iklan di dalamnya ikut terhapus.')) return
    try {
      const res = await fetch(`/api/admin/ad-slots/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSuccess('Ad slot deleted!')
      fetchAdsData()
    } catch {
      setError('Failed to delete ad slot')
    }
  }

  async function handleSavePricing(slot: AdSlotRow) {
    const edit = pricingEdits[slot.id]
    const pricePerDay = edit?.pricePerDay ?? (slot.pricePerDay?.toString() || '')
    const defaultDurationDays = edit?.defaultDurationDays ?? slot.defaultDurationDays.toString()

    setSavingPricingId(slot.id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/ad-slots/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricePerDay: pricePerDay === '' ? null : Number(pricePerDay),
          defaultDurationDays: Number(defaultDurationDays),
        }),
      })
      if (!res.ok) throw new Error('Failed to save pricing')
      setSuccess('Pricing updated!')
      fetchAdsData()
    } catch {
      setError('Failed to save pricing')
    } finally {
      setSavingPricingId(null)
    }
  }

  async function handleCreateAd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!adFile) {
      setError('Pilih file gambar/video dulu')
      return
    }
    setFormSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('slotId', adForm.slotId)
      if (adForm.advertiserId) {
        formData.append('advertiserId', adForm.advertiserId)
        if (adForm.invoiceAmount) formData.append('invoiceAmount', adForm.invoiceAmount)
      } else {
        formData.append('advertiserName', adForm.advertiserName)
      }
      formData.append('linkUrl', adForm.linkUrl)
      formData.append('startDate', adForm.startDate)
      formData.append('endDate', adForm.endDate)
      formData.append('file', adFile)

      const res = await fetch('/api/admin/ads', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create ad')
      setSuccess(adForm.advertiserId ? 'Ad & invoice created!' : 'Ad created!')
      setShowAdDialog(false)
      setAdForm({ slotId: '', advertiserId: '', advertiserName: '', linkUrl: '', startDate: '', endDate: '', invoiceAmount: '' })
      setAdFile(null)
      fetchAdsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ad')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleToggleAdActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/admin/ads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      fetchAdsData()
    } catch {
      setError('Failed to update ad')
    }
  }

  async function handleDeleteAd(id: string) {
    if (!confirm('Hapus iklan ini?')) return
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSuccess('Ad deleted!')
      fetchAdsData()
    } catch {
      setError('Failed to delete ad')
    }
  }

  // Edit Ad dialog state
  const [showEditAdDialog, setShowEditAdDialog] = useState(false)
  const [editingAdId, setEditingAdId] = useState<string | null>(null)
  const [editAdForm, setEditAdForm] = useState({ advertiserName: '', linkUrl: '', startDate: '', endDate: '', isActive: true })
  const [editAdFile, setEditAdFile] = useState<File | null>(null)

  function openEditAd(ad: AdRow) {
    setEditingAdId(ad.id)
    setEditAdForm({
      advertiserName: ad.advertiserName,
      linkUrl: ad.linkUrl || '',
      startDate: ad.startDate.slice(0, 10),
      endDate: ad.endDate.slice(0, 10),
      isActive: ad.isActive,
    })
    setEditAdFile(null)
    setShowEditAdDialog(true)
  }

  async function handleUpdateAd(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAdId) return
    setError(null)
    setFormSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('advertiserName', editAdForm.advertiserName)
      formData.append('linkUrl', editAdForm.linkUrl)
      formData.append('startDate', editAdForm.startDate)
      formData.append('endDate', editAdForm.endDate)
      formData.append('isActive', String(editAdForm.isActive))
      if (editAdFile) formData.append('file', editAdFile)

      const res = await fetch(`/api/admin/ads/${editingAdId}`, { method: 'PATCH', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update ad')
      setSuccess('Ad updated!')
      setShowEditAdDialog(false)
      setEditingAdId(null)
      fetchAdsData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ad')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Advertisers panel state
  const [advertisers, setAdvertisers] = useState<AdvertiserRow[]>([])
  const [advertisersLoading, setAdvertisersLoading] = useState(false)

  async function fetchAdvertisers() {
    setAdvertisersLoading(true)
    try {
      const res = await fetch('/api/admin/advertisers')
      const data = await res.json()
      if (Array.isArray(data.advertisers)) setAdvertisers(data.advertisers)
    } catch (err) {
      console.error('Error fetching advertisers:', err)
    } finally {
      setAdvertisersLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'advertisers' && advertisers.length === 0) {
      fetchAdvertisers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Team (Redaksi) panel state - the masthead roster shown on About Us /
  // Editorial Team, editable here so the public pages never need fake
  // placeholder headcounts again.
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState({ name: '', role: '', bio: '', photoUrl: '', order: 0, isActive: true })
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(false)

  async function fetchTeamMembers() {
    setTeamLoading(true)
    try {
      const res = await fetch('/api/admin/team')
      const data = await res.json()
      if (Array.isArray(data.members)) setTeamMembers(data.members)
    } catch (err) {
      console.error('Error fetching team members:', err)
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'team' && teamMembers.length === 0) {
      fetchTeamMembers()
    }
  }, [activeTab])

  function openAddTeamMember() {
    setEditingTeamId(null)
    setTeamForm({ name: '', role: '', bio: '', photoUrl: '', order: teamMembers.length, isActive: true })
    setShowTeamDialog(true)
  }

  function openEditTeamMember(m: TeamMemberRow) {
    setEditingTeamId(m.id)
    setTeamForm({ name: m.name, role: m.role, bio: m.bio || '', photoUrl: m.photoUrl || '', order: m.order, isActive: m.isActive })
    setShowTeamDialog(true)
  }

  async function handleTeamPhotoUpload(file: File) {
    setUploadingTeamPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('label', teamForm.name || 'team-member')
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload photo')
      setTeamForm((f) => ({ ...f, photoUrl: data.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploadingTeamPhoto(false)
    }
  }

  async function handleSaveTeamMember(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFormSubmitting(true)
    try {
      const url = editingTeamId ? `/api/admin/team/${editingTeamId}` : '/api/admin/team'
      const method = editingTeamId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save team member')
      setSuccess(editingTeamId ? 'Anggota tim diperbarui!' : 'Anggota tim ditambahkan!')
      setShowTeamDialog(false)
      fetchTeamMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team member')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeleteTeamMember(id: string) {
    if (!confirm('Hapus anggota tim ini?')) return
    try {
      const res = await fetch(`/api/admin/team/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setSuccess('Anggota tim dihapus!')
      fetchTeamMembers()
    } catch {
      setError('Failed to delete team member')
    }
  }

  // Articles tab: load the first month lazily, only once the tab is
  // actually opened - not on every dashboard visit.
  useEffect(() => {
    if (activeTab === 'articles' && !articlesTabLoaded) {
      setArticlesTabLoaded(true)
      fetchMonthlyArticles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // List News tab genuinely wants every article at once (its whole point is
  // copying the full list) - fetched once, lazily, only when that specific
  // tab is opened, so it doesn't add to every other tab's load weight.
  useEffect(() => {
    if (activeTab === 'listnews' && !listNewsLoaded) {
      setListNewsLoaded(true)
      fetch('/api/admin/articles')
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data.articles)) setArticles(data.articles) })
        .catch((err) => console.error('Failed to load articles for List News:', err))
    }
  }, [activeTab, listNewsLoaded])

  // Metrics + Trash tabs: same lazy-on-open pattern. Overview also triggers
  // this (once) since it shows the "Most Viewed Article" card sourced from
  // the same data - avoids a second, redundant fetch if the admin then
  // opens the full Metrics tab.
  useEffect(() => {
    if ((activeTab === 'metrics' || activeTab === 'overview') && !metrics && !metricsLoading) {
      fetchMetrics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'trash' && trashList === null && !trashLoading) {
      fetchTrash()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'email' && contactSubmissions === null && !contactLoading) {
      fetchContactSubmissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'ai' && agentMemories === null && !memoriesLoading) {
      fetchAgentMemories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])


  async function handleApproveAdvertiser(id: string) {
    try {
      const res = await fetch(`/api/admin/advertisers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      if (!res.ok) throw new Error('Failed to approve advertiser')
      setSuccess('Advertiser approved!')
      fetchAdvertisers()
    } catch {
      setError('Failed to approve advertiser')
    }
  }

  async function handleRejectAdvertiser(id: string) {
    const reason = prompt('Alasan penolakan (opsional):') || undefined
    try {
      const res = await fetch(`/api/admin/advertisers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
      })
      if (!res.ok) throw new Error('Failed to reject advertiser')
      setSuccess('Advertiser rejected')
      fetchAdvertisers()
    } catch {
      setError('Failed to reject advertiser')
    }
  }

  // Invoices panel state
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  async function fetchInvoices() {
    setInvoicesLoading(true)
    try {
      const res = await fetch('/api/admin/invoices')
      const data = await res.json()
      if (Array.isArray(data.invoices)) setInvoices(data.invoices)
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  async function handleVerifyInvoicePaid(id: string) {
    if (!confirm('Konfirmasi: tandai invoice ini LUNAS? Iklan akan langsung aktif tayang.')) return
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) throw new Error('Failed to verify invoice')
      setSuccess('Invoice diverifikasi lunas, iklan aktif!')
      fetchInvoices()
    } catch {
      setError('Failed to verify invoice')
    }
  }

  async function handleRejectInvoice(id: string) {
    const reason = prompt('Alasan penolakan bukti transfer (opsional):') || undefined
    try {
      const res = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionReason: reason }),
      })
      if (!res.ok) throw new Error('Failed to reject invoice')
      setSuccess('Invoice rejected')
      fetchInvoices()
    } catch {
      setError('Failed to reject invoice')
    }
  }

  // Company settings state (used in Settings tab)
  const [companySettings, setCompanySettings] = useState<CompanySettingsData>({
    companyName: '', address: '', npwp: '', phone: '', bankName: '', bankAccountNo: '', bankAccountName: '',
  })
  const [companySettingsLoaded, setCompanySettingsLoaded] = useState(false)
  const [savingCompanySettings, setSavingCompanySettings] = useState(false)

  async function fetchCompanySettings() {
    try {
      const res = await fetch('/api/admin/company-settings')
      const data = await res.json()
      if (data.settings) {
        setCompanySettings({
          companyName: data.settings.companyName || '',
          address: data.settings.address || '',
          npwp: data.settings.npwp || '',
          phone: data.settings.phone || '',
          bankName: data.settings.bankName || '',
          bankAccountNo: data.settings.bankAccountNo || '',
          bankAccountName: data.settings.bankAccountName || '',
        })
      }
    } catch (err) {
      console.error('Error fetching company settings:', err)
    } finally {
      setCompanySettingsLoaded(true)
    }
  }

  useEffect(() => {
    if (activeTab === 'settings' && !companySettingsLoaded) {
      fetchCompanySettings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function handleSaveCompanySettings() {
    setSavingCompanySettings(true)
    try {
      const res = await fetch('/api/admin/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companySettings),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSuccess('Company settings saved!')
    } catch {
      setError('Failed to save company settings')
    } finally {
      setSavingCompanySettings(false)
    }
  }

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Debounced server-side search for the Articles tab - searches every
  // article regardless of which months are currently loaded.
  useEffect(() => {
    if (activeTab !== 'articles' || articlesView !== 'all') return
    const handle = setTimeout(() => searchArticles(searchQuery), 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeTab, articlesView])

  // Fetch the High Risk & Critical list on first switch to that sub-view -
  // fetchHighRiskList() is itself idempotent (skips if already loaded), so
  // this is also what makes the Overview popup and this tab share one fetch.
  useEffect(() => {
    if (activeTab === 'articles' && articlesView === 'risk') {
      fetchHighRiskList()
    }
  }, [activeTab, articlesView])

  // Infinite scroll: load the next older month once the sentinel row at the
  // bottom of the Articles table scrolls into view.
  const articlesSentinelRef = useRef<HTMLTableRowElement | null>(null)
  useEffect(() => {
    const el = articlesSentinelRef.current
    if (!el || activeTab !== 'articles' || articlesView !== 'all' || searchQuery.trim()) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchMonthlyArticles()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, articlesView, searchQuery, articlesHasMore, articlesLoadingMore])
  const [authChecked, setAuthChecked] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()

        if (!res.ok || !data.user || (data.user.role !== 'ADMIN' && data.user.role !== 'EDITOR')) {
          router.push('/login')
          return
        }

        setAuthChecked(true)
      } catch (err) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  // Fetch all data on mount
  useEffect(() => {
    if (authChecked) {
      fetchAllData()
    }
  }, [authChecked])

  // Fetched on auth (not gated to the tab) so the pending-count badge on the
  // "Invoices" sidebar item is visible before admin ever opens that tab.
  useEffect(() => {
    if (authChecked) {
      fetchInvoices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked])

  const pendingInvoiceCount = invoices.filter((inv) => inv.status === 'VERIFYING').length

  // Overview cards + popups now read from a cheap aggregate endpoint
  // (count()/groupBy() queries) instead of loading every article row just
  // to .filter().length it here - that full-articles fetch was the actual
  // weight behind the admin panel feeling heavy as the article count grew.
  async function fetchAllData() {
    setLoading(true)
    try {
      const [statsRes, commentsRes, usersRes, reportsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/comments'),
        fetch('/api/admin/users'),
        fetch('/api/admin/reports'),
      ])

      const statsData = statsRes.ok ? await statsRes.json() : null
      const commentsData = commentsRes.ok ? await commentsRes.json() : { comments: [] }
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
      const reportsData = reportsRes.ok ? await reportsRes.json() : []

      if (Array.isArray(commentsData.comments)) setComments(commentsData.comments)
      if (Array.isArray(usersData.users)) setUsers(usersData.users)
      if (Array.isArray(reportsData)) setReports(reportsData)

      if (statsData) {
        setStats({
          totalArticles: statsData.totalArticles || 0,
          publishedArticles: statsData.publishedArticles || 0,
          totalUsers: statsData.totalUsers || 0,
          totalComments: statsData.totalComments || 0,
          pendingComments: statsData.pendingComments || 0,
          highRiskArticles: statsData.highRiskArticles || 0,
          byStatus: statsData.byStatus || {},
          byCategory: statsData.byCategory || {},
          byRole: statsData.byRole || {},
        })
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  /** Fetches the next OLDER calendar month of articles for the Articles tab table. */
  async function fetchMonthlyArticles() {
    if (articlesLoadingMore || !articlesHasMore) return
    setArticlesLoadingMore(true)
    try {
      const url = articlesCursor
        ? `/api/admin/articles/by-month?before=${encodeURIComponent(articlesCursor)}`
        : '/api/admin/articles/by-month'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load articles')
      const data = await res.json()
      setMonthlyArticles((prev) => [...prev, ...(data.articles || [])])
      setArticlesHasMore(!!data.hasMore)
      setArticlesCursor(data.month ? `${data.month}-01` : undefined)
    } catch (err) {
      console.error('Failed to load monthly articles:', err)
    } finally {
      setArticlesLoadingMore(false)
    }
  }

  /** Server-side search across every article (not just loaded months) - Articles tab search box. */
  async function searchArticles(q: string) {
    if (!q.trim()) {
      setSearchResults(null)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/admin/articles?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data.articles) ? data.articles : [])
    } catch (err) {
      console.error('Article search failed:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  async function fetchHighRiskList() {
    if (highRiskList !== null || highRiskLoading) return
    setHighRiskLoading(true)
    try {
      const res = await fetch('/api/admin/articles?riskLevel=HIGH,CRITICAL')
      const data = await res.json()
      setHighRiskList(Array.isArray(data.articles) ? data.articles : [])
    } catch (err) {
      console.error('Failed to load high-risk articles:', err)
    } finally {
      setHighRiskLoading(false)
    }
  }

  async function fetchMetrics() {
    setMetricsLoading(true)
    try {
      const res = await fetch('/api/admin/metrics')
      const data = await res.json()
      setMetrics(data)
    } catch (err) {
      console.error('Failed to load metrics:', err)
    } finally {
      setMetricsLoading(false)
    }
  }

  async function fetchTrash() {
    setTrashLoading(true)
    try {
      const res = await fetch('/api/admin/articles/trash')
      const data = await res.json()
      setTrashList(Array.isArray(data.articles) ? data.articles : [])
    } catch (err) {
      console.error('Failed to load trash:', err)
    } finally {
      setTrashLoading(false)
    }
  }

  async function handleRestoreArticle(id: string) {
    try {
      const res = await fetch(`/api/articles/${id}/restore`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to restore')
      setTrashList((prev) => (prev || []).filter((a) => a.id !== id))
      setSuccess('Artikel dipulihkan dari Trash!')
      fetchAllData()
    } catch {
      setError('Gagal memulihkan artikel')
    }
  }

  async function handlePermanentDelete(id: string, title: string) {
    if (!confirm(`Hapus permanen "${title}"? Tindakan ini TIDAK BISA dibatalkan.`)) return
    try {
      const res = await fetch(`/api/articles/${id}/permanent`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setTrashList((prev) => (prev || []).filter((a) => a.id !== id))
      setSuccess('Artikel dihapus permanen.')
    } catch {
      setError('Gagal menghapus artikel permanen')
    }
  }

  async function fetchAgentMemories() {
    setMemoriesLoading(true)
    try {
      const params = new URLSearchParams()
      if (memoryAgentFilter !== 'all') params.set('agentKey', memoryAgentFilter)
      if (memorySearch.trim()) params.set('q', memorySearch.trim())
      const res = await fetch(`/api/admin/ai/memory?${params.toString()}`)
      const data = await res.json()
      setAgentMemories(Array.isArray(data.memories) ? data.memories : [])
      setAgentMemoriesTotal(data.total || 0)
      setAgentMemoriesByAgent(data.byAgent || [])
    } catch (err) {
      console.error('Failed to load agent memories:', err)
    } finally {
      setMemoriesLoading(false)
    }
  }

  async function handleDeleteMemory(id: string) {
    if (!confirm('Hapus memory ini? AI tidak akan lagi mengingat keputusan ini.')) return
    try {
      const res = await fetch(`/api/admin/ai/memory/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setAgentMemories((prev) => (prev || []).filter((m) => m.id !== id))
      setAgentMemoriesTotal((t) => Math.max(0, t - 1))
    } catch {
      setError('Gagal menghapus memory')
    }
  }

  async function fetchContactSubmissions() {
    setContactLoading(true)
    try {
      const res = await fetch('/api/admin/contact-submissions')
      const data = await res.json()
      setContactSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
    } catch (err) {
      console.error('Failed to load contact submissions:', err)
    } finally {
      setContactLoading(false)
    }
  }

  function openSubmission(sub: ContactSubmissionItem) {
    setSelectedSubmission(sub)
    setReplyText('')
    if (sub.status === 'UNREAD') {
      fetch(`/api/admin/contact-submissions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READ' }),
      }).then(() => {
        setContactSubmissions((prev) => (prev || []).map((s) => (s.id === sub.id ? { ...s, status: 'READ' } : s)))
      })
    }
  }

  async function handleSendReply() {
    if (!selectedSubmission || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/admin/contact-submissions/${selectedSubmission.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reply')
      setContactSubmissions((prev) => (prev || []).map((s) => (s.id === selectedSubmission.id ? data.submission : s)))
      setSelectedSubmission(data.submission)
      setReplyText('')
      setSuccess('Balasan terkirim!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim balasan')
    } finally {
      setSendingReply(false)
    }
  }

  async function handleArchiveSubmission(id: string) {
    try {
      const res = await fetch(`/api/admin/contact-submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error('Failed to archive')
      setContactSubmissions((prev) => (prev || []).map((s) => (s.id === id ? data.submission : s)))
      if (selectedSubmission?.id === id) setSelectedSubmission(data.submission)
    } catch {
      setError('Gagal mengarsipkan pesan')
    }
  }

  function resetArticleForm() {
    setArticleForm({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      category: '',
      featuredImageUrl: '',
      featuredImageAlt: '',
      imageSource: '',
      status: 'DRAFT',
    })
    setSlugTouched(false)
    setRiskAnalysis(null)
    setAnalyzingRisk(false)
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 150)
  }

  async function handleFeaturedImageUpload(file: File) {
    setUploadingFeaturedImage(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('label', articleForm.title || 'article')
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload image')
      setArticleForm((f) => ({ ...f, featuredImageUrl: data.url, imageSource: f.imageSource || 'Manual Upload' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingFeaturedImage(false)
    }
  }

  async function handleCreateArticle(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...articleForm,
          status: articleForm.status || 'DRAFT',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create article')
      }

      setSuccess('Article created successfully!')
      setShowArticleDialog(false)
      resetArticleForm()
      fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateArticle(e: React.FormEvent) {
    e.preventDefault()
    if (!editingArticle) return

    setError(null)
    setLoading(true)

    try {
      // Include the re-analyzed risk (if the admin clicked "Analyze Legal
      // Risk" after editing) so it actually gets saved - previously this
      // was only ever shown in the dialog and discarded on save, leaving
      // the stored riskLevel stuck at whatever it was when the article was
      // first created even after the risky content was edited out.
      const res = await fetch(`/api/articles/${editingArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...articleForm, riskAnalysis: riskAnalysis || undefined }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update article')
      }

      setSuccess('Article updated successfully!')
      setShowArticleDialog(false)
      setEditingArticle(null)
      resetArticleForm()
      fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoUpload(position: 'top' | 'middle' | 'bottom', file: File) {
    if (!editingArticle) return

    setUploadingSlot(position)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('position', position)

      const res = await fetch(`/api/admin/articles/${editingArticle.id}/upload-image`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setSuccess(`Photo uploaded (${position}) and converted to WebP!`)
      setEditingArticle(data.article)
      fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploadingSlot(null)
    }
  }

  function photoCount(article: Article | null): number {
    if (!article) return 0
    const inContent = (article.content.match(/<img\b/gi) || []).length
    return inContent + (article.featuredImageUrl ? 1 : 0)
  }

  async function handleDeleteArticle(id: string) {
    if (!confirm('Move this article to Trash? You can restore it later, or permanently delete it from the Trash panel.')) return

    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      removeArticleFromLists(id)
      setSuccess('Artikel dipindahkan ke Trash.')
    } catch (err) {
      setError('Failed to delete article')
    }
  }

  async function handlePublishArticle(id: string) {
    try {
      const res = await fetch(`/api/articles/${id}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to publish')
      setSuccess(data.published ? 'Article published!' : 'Article unpublished')
      fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish article')
    }
  }

  async function handleCommentAction(id: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setSuccess(`Comment ${action}d!`)
      fetchAllData()
    } catch (err) {
      setError('Failed to update comment')
    }
  }

  async function handleReportStatusChange(id: string, status: string) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setSuccess('Status laporan diperbarui!')
    } catch {
      setError('Failed to update report status')
      fetchAllData()
    }
  }

  async function handleUserRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setSuccess('User role updated!')
      fetchAllData()
    } catch (err) {
      setError('Failed to update user role')
    }
  }

  async function analyzeRisk() {
    if (!articleForm.content || !articleForm.title) return

    setAnalyzingRisk(true)
    try {
      const res = await fetch('/api/articles/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: articleForm.content, title: articleForm.title }),
      })
      const data = await res.json()
      if (res.ok) {
        setRiskAnalysis(data)
      }
    } catch (err) {
      console.error('Risk analysis failed:', err)
    } finally {
      setAnalyzingRisk(false)
    }
  }



  function openEditArticle(article: Article) {
    setEditingArticle(article)
    setArticleForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      featuredImageUrl: article.featuredImageUrl || '',
      featuredImageAlt: article.featuredImageAlt || '',
      imageSource: article.imageSource || '',
      status: article.status,
    })
    setSlugTouched(true) // an existing slug should never silently change just because the title is edited
    setShowArticleDialog(true)
  }

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Konfirmasi password baru tidak cocok')
      return
    }
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengganti password')
      setSuccess('Password berhasil diganti!')
      setShowChangePasswordDialog(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengganti password')
    }
  }


  // Patches one article in-place across every list that might be holding
  // it (month-paginated view, search results, high-risk view) so the row
  // reflects a repair's result immediately instead of needing a full
  // refetch (fetchAllData() only refreshes the Overview aggregate counts,
  // not these row-level lists).
  function updateArticleInLists(id: string, patch: Partial<Article>) {
    const apply = (list: Article[]) => list.map((a) => (a.id === id ? { ...a, ...patch } : a))
    setMonthlyArticles(apply)
    setSearchResults((prev) => (prev ? apply(prev) : prev))
    setHighRiskList((prev) => (prev ? apply(prev) : prev))
  }

  // Used when an article moves to Trash - fetchAllData()/fetchMonthlyArticles()
  // alone wouldn't remove it from an already-loaded month's list (that fetch
  // is cursor-based, only ever appends NEW months, never re-fetches ones
  // already in state).
  function removeArticleFromLists(id: string) {
    const remove = (list: Article[]) => list.filter((a) => a.id !== id)
    setMonthlyArticles(remove)
    setSearchResults((prev) => (prev ? remove(prev) : prev))
    setHighRiskList((prev) => (prev ? remove(prev) : prev))
  }

  const [repairPopupArticle, setRepairPopupArticle] = useState<Article | null>(null)
  const [riskCheckResult, setRiskCheckResult] = useState<{ before: string; after: string; resolved: boolean; wasRewritten: boolean } | null>(null)

  async function handleRepairImage(id: string, title: string) {
    if (!confirm(`Regenerate image for "${title}"? This will replace the current image.`)) return

    try {
      const res = await fetch(`/api/articles/${id}/repair`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to repair image')

      updateArticleInLists(id, { featuredImageUrl: data.imageUrl })
      setSuccess('Image repaired successfully!')
      setRepairPopupArticle(null)
      fetchAllData()
    } catch (err) {
      setError('Failed to repair image')
    }
  }

  async function handleRepairRisk(id: string) {
    setRiskCheckResult(null)
    try {
      const res = await fetch(`/api/articles/${id}/repair-risk`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to check legal risk')

      updateArticleInLists(id, {
        riskLevel: data.after.riskLevel,
        riskScore: data.after.riskScore,
        ...(data.published ? { status: 'PUBLISHED', publishedAt: new Date().toISOString() } : {}),
      })
      setRiskCheckResult({ before: data.before.riskLevel, after: data.after.riskLevel, resolved: data.resolved, wasRewritten: data.wasRewritten })

      if (data.published) {
        setSuccess(`Risiko turun ke ${data.after.riskLevel} dan semua syarat terpenuhi - artikel langsung dipublikasikan!`)
      } else if (!data.wasRewritten) {
        setSuccess(`Risiko saat ini: ${data.after.riskLevel} (${data.after.riskScore}). Tidak ada konten CRITICAL yang perlu diperbaiki.${data.missingRequirements?.length ? ' Belum bisa publish: ' + data.missingRequirements.join(', ') : ''}`)
      } else if (data.resolved) {
        setSuccess(`Risiko berhasil diturunkan dari ${data.before.riskLevel} ke ${data.after.riskLevel}.${data.missingRequirements?.length ? ' Belum bisa publish: ' + data.missingRequirements.join(', ') : ' Artikel sudah bisa dipublikasikan.'}`)
      } else {
        setError(`Masih CRITICAL (${data.after.riskScore}) setelah 3 percobaan perbaikan - perlu diedit manual.`)
      }
      fetchAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check legal risk')
    }
  }

  // Articles tab: while searching, results come from the server (every
  // article, regardless of which months happen to be loaded); otherwise
  // show whatever months have been lazily loaded so far.
  const isSearchingArticles = searchQuery.trim().length > 0
  const filteredArticles =
    articlesView === 'risk'
      ? (highRiskList ?? [])
          .filter((a) => !isSearchingArticles || a.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice()
          .sort((a, b) => b.riskScore - a.riskScore)
      : isSearchingArticles
        ? (searchResults ?? [])
        : monthlyArticles

  // Filter Comments
  const filteredComments = comments.filter(c => {
    const q = searchQuery.toLowerCase()
    return (
      c.content.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q) ||
      c.article.title.toLowerCase().includes(q)
    )
  })

  // Filter Users
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  })

  const activeNavLabel = NAV_ITEMS.find((item) => item.value === activeTab)?.label || 'Overview'

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <LayoutDashboard className="h-6 w-6 text-primary shrink-0" />
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-bold text-sm leading-tight">Jurnal Kotabunan Master</span>
              <Badge variant="secondary" className="w-fit text-[10px] mt-0.5">v2.1.0</Badge>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {NAV_GROUPS.map((group, gi) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={activeTab === item.value}
                      onClick={() => setActiveTab(item.value)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {item.value === 'invoices' && pendingInvoiceCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">{pendingInvoiceCount}</Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              {gi < NAV_GROUPS.length - 1 && <SidebarSeparator className="mx-0" />}
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setShowChangePasswordDialog(true)} tooltip="Ganti Password">
                <KeyRound />
                <span>Ganti Password</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="View Site">
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <LinkIcon />
                  <span>View Site</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Ganti Password</DialogTitle>
              <DialogDescription>Ganti password login akun kamu.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowChangePasswordDialog(false)}>
                  Batal
                </Button>
                <Button type="submit">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Ganti Password
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Sidebar>

      <SidebarInset>
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center gap-3">
          <SidebarTrigger />
          <span className="font-semibold text-lg">{activeNavLabel}</span>
        </div>
      </header>

      <main className="px-4 py-6 md:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

          <TabsContent value="overview">
            <div className="grid gap-6">
              <div>
                <h2 className="text-xl font-semibold">Welcome back, Admin</h2>
                <p className="text-sm text-muted-foreground">Here is what's happening on Jurnal Kotabunan today.</p>
              </div>

              {/* Most Viewed Article - added per request, above Quick Stats */}
              {metrics && metrics.topViewed.length > 0 && (
                <Card
                  className="cursor-pointer transition-colors hover:bg-muted/50 border-primary/30"
                  onClick={() => setActiveTab('metrics')}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4" /> Berita dengan View Terbanyak
                      </p>
                      <h3 className="text-lg font-bold truncate">{metrics.topViewed[0].title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{metrics.topViewed[0].category} • {metrics.topViewed[0].viewCount.toLocaleString()} views</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-primary opacity-30 shrink-0" />
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats - click a card for a breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setStatDialog('articles')}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Articles</p>
                      <h3 className="text-2xl font-bold">{stats.totalArticles}</h3>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setStatDialog('comments')}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pending Comments</p>
                      <h3 className="text-2xl font-bold">{stats.pendingComments}</h3>
                    </div>
                    <MessageCircle className="h-8 w-8 text-yellow-500 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => { setStatDialog('risk'); fetchHighRiskList() }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">High Risk Articles</p>
                      <h3 className="text-2xl font-bold">{stats.highRiskArticles}</h3>
                    </div>
                    <Shield className="h-8 w-8 text-red-500 opacity-20" />
                  </CardContent>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => setStatDialog('users')}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
                    </div>
                    <Users className="h-8 w-8 text-green-500 opacity-20" />
                  </CardContent>
                </Card>
              </div>

              {/* System Health Check - overview-only, was previously rendered
                  outside the Tabs entirely so it showed up on every panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SystemHealthCard />
                <AgentStatusCard />
                <ScheduleCard />
              </div>
            </div>
          </TabsContent>

          {/* Quick-stat detail popups - one Dialog, content swapped by which
              card was clicked. Each just summarizes data already loaded into
              state (no extra API calls) and offers a shortcut into the
              relevant tab for the full view. */}
          <Dialog open={statDialog !== null} onOpenChange={(open) => !open && setStatDialog(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              {statDialog === 'articles' && (() => {
                // Straight from the /api/admin/stats aggregate - no need to
                // have every article's row loaded just to count them.
                const byStatus = ['DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED'].map((s) => ({
                  status: s,
                  count: stats.byStatus[s] || 0,
                }))
                const byCategory = Object.entries(stats.byCategory)
                  .map(([category, count]) => ({ category, count }))
                  .sort((a, b) => b.count - a.count)
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>Total Articles: {stats.totalArticles}</DialogTitle>
                      <DialogDescription>Rincian berdasarkan status dan kategori.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Per Status</p>
                        <div className="space-y-1">
                          {byStatus.map((s) => (
                            <div key={s.status} className="flex items-center justify-between text-sm">
                              <span>{s.status}</span>
                              <Badge variant="secondary">{s.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Per Kategori</p>
                        <div className="space-y-1">
                          {byCategory.map((c) => (
                            <div key={c.category} className="flex items-center justify-between text-sm">
                              <span>{c.category}</span>
                              <Badge variant="secondary">{c.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setActiveTab('articles'); setStatDialog(null) }}>Buka Tab Articles</Button>
                    </DialogFooter>
                  </>
                )
              })()}

              {statDialog === 'comments' && (() => {
                const pending = comments.filter((c) => c.status === 'PENDING')
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>Pending Comments: {stats.pendingComments}</DialogTitle>
                      <DialogDescription>Komentar yang menunggu moderasi.</DialogDescription>
                    </DialogHeader>
                    {pending.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Tidak ada komentar yang menunggu moderasi.</p>
                    ) : (
                      <ScrollArea className="max-h-80">
                        <div className="space-y-3 pr-3">
                          {pending.map((c) => (
                            <div key={c.id} className="rounded-lg border p-3 text-sm">
                              <p className="line-clamp-2">{c.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {c.user.name || c.user.email} · pada &quot;{c.article.title}&quot;
                                {c.toxicityScore != null && <> · toksisitas {Math.round(c.toxicityScore * 100)}%</>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <DialogFooter>
                      <Button onClick={() => { setActiveTab('comments'); setStatDialog(null) }}>Buka Tab Comments</Button>
                    </DialogFooter>
                  </>
                )
              })()}

              {statDialog === 'risk' && (() => {
                // Fetched on-demand (see fetchHighRiskList, triggered when this
                // dialog opens) instead of requiring the full articles list to
                // already be loaded just to filter it client-side.
                const highRisk = (highRiskList || []).slice().sort((a, b) => b.riskScore - a.riskScore)
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>High Risk Articles: {stats.highRiskArticles}</DialogTitle>
                      <DialogDescription>Artikel dengan risiko hukum HIGH atau CRITICAL.</DialogDescription>
                    </DialogHeader>
                    {highRiskLoading ? (
                      <p className="text-sm text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Memuat...
                      </p>
                    ) : highRisk.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Tidak ada artikel berisiko tinggi saat ini.</p>
                    ) : (
                      <ScrollArea className="max-h-80">
                        <div className="space-y-3 pr-3">
                          {highRisk.map((a) => (
                            <div key={a.id} className="rounded-lg border p-3 text-sm">
                              <p className="font-medium line-clamp-1">{a.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={a.riskLevel === 'CRITICAL' ? 'destructive' : 'secondary'}>
                                  {a.riskLevel} · {a.riskScore}/100
                                </Badge>
                                <span className="text-xs text-muted-foreground">{a.category} · {a.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <DialogFooter>
                      <Button onClick={() => { setActiveTab('articles'); setStatDialog(null) }}>Buka Tab Articles</Button>
                    </DialogFooter>
                  </>
                )
              })()}

              {statDialog === 'users' && (() => {
                const byRole = Array.from(new Set(users.map((u) => u.role)))
                  .map((r) => ({ role: r, count: users.filter((u) => u.role === r).length }))
                  .sort((a, b) => b.count - a.count)
                return (
                  <>
                    <DialogHeader>
                      <DialogTitle>Total Users: {stats.totalUsers}</DialogTitle>
                      <DialogDescription>Rincian akun berdasarkan role.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1">
                      {byRole.map((r) => (
                        <div key={r.role} className="flex items-center justify-between text-sm">
                          <span>{r.role}</span>
                          <Badge variant="secondary">{r.count}</Badge>
                        </div>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setActiveTab('users'); setStatDialog(null) }}>Buka Tab Users</Button>
                    </DialogFooter>
                  </>
                )
              })()}
            </DialogContent>
          </Dialog>

          <TabsContent value="listnews">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>List News</CardTitle>
                    <CardDescription>Semua berita - Kategori, Judul, dan Ringkasan singkat</CardDescription>
                  </div>
                  {(() => {
                    const filtered = articles.filter((a) => {
                      const q = listNewsSearch.toLowerCase()
                      return !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
                    })
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filtered.length === 0}
                        onClick={() => handleCopyAllArticles(filtered)}
                      >
                        {copiedId === 'all' ? (
                          <CopyCheck className="h-4 w-4 mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Copy All ({filtered.length})
                      </Button>
                    )
                  })()}
                </div>
                <div className="pt-2">
                  <Input
                    placeholder="Cari judul atau kategori..."
                    value={listNewsSearch}
                    onChange={(e) => setListNewsSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Category</TableHead>
                      <TableHead>Judul Berita</TableHead>
                      <TableHead>Short Description</TableHead>
                      <TableHead className="w-[80px] text-right">Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles
                      .filter((a) => {
                        const q = listNewsSearch.toLowerCase()
                        return !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
                      })
                      .map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Badge variant="secondary">{a.category}</Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs">{a.title}</TableCell>
                          <TableCell className="text-muted-foreground max-w-md">{a.excerpt}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleCopyArticle(a)}>
                              {copiedId === a.id ? (
                                <CopyCheck className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {articles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Belum ada berita.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Article Management</CardTitle>
                    <CardDescription>Create, edit, and manage all articles</CardDescription>
                  </div>
                  <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetArticleForm(); setEditingArticle(null); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Article
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
                        <DialogDescription>
                          Fill in the article details. AI will analyze legal risk automatically.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={editingArticle ? handleUpdateArticle : handleCreateArticle} className="space-y-6">
                        {/* Informasi Utama */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Informasi Utama</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Judul *</Label>
                              <Input
                                id="title"
                                value={articleForm.title}
                                onChange={(e) => {
                                  const title = e.target.value
                                  setArticleForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }))
                                }}
                                placeholder="Judul artikel"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="slug">Slug (URL) *</Label>
                              <Input
                                id="slug"
                                value={articleForm.slug}
                                onChange={(e) => {
                                  setSlugTouched(true)
                                  setArticleForm({ ...articleForm, slug: e.target.value })
                                }}
                                placeholder="otomatis-dari-judul"
                                required
                              />
                              <p className="text-xs text-muted-foreground">
                                Bagian URL artikel: jurnal.kotabunan.com/article/<span className="font-mono">{articleForm.slug || '...'}</span>. Terisi otomatis dari judul, bisa diubah manual.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="excerpt">Excerpt (Ringkasan) *</Label>
                            <Textarea
                              id="excerpt"
                              value={articleForm.excerpt}
                              onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                              placeholder="Ringkasan singkat (50-300 karakter)"
                              rows={2}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Kutipan singkat yang tampil di kartu berita, hasil pencarian Google, dan preview link saat dibagikan - bukan isi lengkap artikel.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="category">Kategori *</Label>
                              <Select
                                value={articleForm.category}
                                onValueChange={(value) => setArticleForm({ ...articleForm, category: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={articleForm.status}
                                onValueChange={(value) => setArticleForm({ ...articleForm, status: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="DRAFT">Draft - belum tayang, hanya admin yang lihat</SelectItem>
                                  <SelectItem value="REVIEW">Review - menunggu review editor</SelectItem>
                                  <SelectItem value="PUBLISHED">Published - langsung tayang di situs</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Gambar Utama */}
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Gambar Utama</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Rekomendasi ukuran: <span className="font-medium text-foreground">1200×675px (rasio 16:9)</span> - gambar yang Anda upload otomatis dikonversi ke WebP (file kecil, tetap jernih).
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="featuredImageUrl">Image URL *</Label>
                                <div className="relative">
                                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    id="featuredImageUrl"
                                    type="text"
                                    value={articleForm.featuredImageUrl}
                                    onChange={(e) => setArticleForm({ ...articleForm, featuredImageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="pl-10"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">Tempel link gambar yang sudah ada, atau upload file di bawah ini.</p>
                              </div>
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  id="featured-image-upload"
                                  disabled={uploadingFeaturedImage}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) setPendingFeaturedImageFile(file)
                                    e.target.value = ''
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingFeaturedImage}
                                  onClick={() => document.getElementById('featured-image-upload')?.click()}
                                >
                                  {uploadingFeaturedImage ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                  )}
                                  Upload Gambar dari Komputer
                                </Button>
                                <ImageCropDialog
                                  file={pendingFeaturedImageFile}
                                  onClose={() => setPendingFeaturedImageFile(null)}
                                  onCropComplete={(croppedFile) => handleFeaturedImageUpload(croppedFile)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="featuredImageAlt">Image Alt Text *</Label>
                                <Input
                                  id="featuredImageAlt"
                                  value={articleForm.featuredImageAlt}
                                  onChange={(e) => setArticleForm({ ...articleForm, featuredImageAlt: e.target.value })}
                                  placeholder="Deskripsikan isi gambar"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Teks deskripsi gambar untuk pembaca tunanetra (screen reader) dan SEO gambar - jelaskan apa yang terlihat di foto, bukan judul artikel.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="imageSource">Image Source *</Label>
                                <Input
                                  id="imageSource"
                                  value={articleForm.imageSource}
                                  onChange={(e) => setArticleForm({ ...articleForm, imageSource: e.target.value })}
                                  placeholder="Fotografer atau sumber"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Kredit/atribusi gambar yang tampil di caption bawah foto artikel, mis. nama fotografer, "AI-Generated Illustration", atau "Manual Upload".
                                </p>
                              </div>
                            </div>
                            {articleForm.featuredImageUrl && (
                              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                                <Image
                                  src={articleForm.featuredImageUrl}
                                  alt={articleForm.featuredImageAlt || 'Preview'}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Konten */}
                        <div className="space-y-2 border-t pt-4">
                          <Label htmlFor="content">Content (Isi Artikel) *</Label>
                          <Textarea
                            id="content"
                            value={articleForm.content}
                            onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                            placeholder="Tulis isi artikel di sini... (mendukung HTML: <p>, <h3>, <ul>, <li>, dst.)"
                            rows={10}
                            required
                          />
                        </div>

                        {/* Risk Analysis */}
                        <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                          <Button type="button" variant="outline" onClick={analyzeRisk} disabled={analyzingRisk}>
                            {analyzingRisk ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Shield className="h-4 w-4 mr-2" />
                            )}
                            Analyze Legal Risk
                          </Button>
                          {riskAnalysis && (
                            <div className="flex items-center gap-4">
                              <Badge variant={riskAnalysis.riskLevel === 'LOW' ? 'default' : riskAnalysis.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'}>
                                Risk: {riskAnalysis.riskScore}/100 ({riskAnalysis.riskLevel})
                              </Badge>
                              {riskAnalysis.containsAccusation && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          )}
                        </div>

                        {editingArticle ? (
                          <div className="space-y-2 border-t pt-4">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Foto Artikel ({photoCount(editingArticle)}/3) - dikonversi otomatis ke WebP
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {(['top', 'middle', 'bottom'] as const).map((slot) => {
                                // 'top' REPLACES the one featuredImageUrl slot
                                // (never adds a new photo), so the 3-photo cap
                                // must not gate it - only 'middle'/'bottom'
                                // actually add a new <img> to the content. Bug
                                // found 2026-09-02: this button used to disable
                                // for ALL three slots once an article hit 3
                                // photos, so "Foto Utama" (replace) became
                                // permanently unclickable on any article that
                                // already had its featured image + 2 content
                                // photos - matches the server-side fix in
                                // src/app/api/admin/articles/[id]/upload-image.
                                const atCap = slot !== 'top' && photoCount(editingArticle) >= 3
                                return (
                                <div key={slot}>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id={`photo-upload-${slot}`}
                                    disabled={uploadingSlot !== null || atCap}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handlePhotoUpload(slot, file)
                                      e.target.value = ''
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingSlot !== null || atCap}
                                    onClick={() => document.getElementById(`photo-upload-${slot}`)?.click()}
                                  >
                                    {uploadingSlot === slot ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4 mr-2" />
                                    )}
                                    {slot === 'top' ? 'Foto Utama' : slot === 'middle' ? 'Foto Tengah' : 'Foto Bawah'}
                                  </Button>
                                </div>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground border-t pt-4">
                            Foto tambahan di tengah/bawah isi artikel baru bisa diupload setelah artikel disimpan (buka lagi lewat tombol Edit) - upload gambar utama di atas sudah bisa dipakai sekarang.
                          </p>
                        )}

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowArticleDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            {editingArticle ? 'Update' : 'Create'} Article
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant={articlesView === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setArticlesView('all')}
                  >
                    Semua Artikel
                  </Button>
                  <Button
                    variant={articlesView === 'risk' ? 'default' : 'outline'}
                    size="sm"
                    className={articlesView === 'risk' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}
                    onClick={() => setArticlesView('risk')}
                  >
                    <ShieldAlert className="h-4 w-4 mr-1.5" />
                    High Risk & Critical
                    {stats.highRiskArticles > 0 && (
                      <Badge variant="secondary" className="ml-1.5 bg-white/20 text-inherit hover:bg-white/20">
                        {stats.highRiskArticles}
                      </Badge>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={articlesView === 'risk' ? 'Filter judul di daftar High Risk & Critical...' : 'Search articles...'}
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] hidden sm:table-cell">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Risk</TableHead>
                      <TableHead className="hidden xl:table-cell">Views</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articlesView === 'risk' && highRiskLoading && highRiskList === null ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Memuat artikel HIGH & CRITICAL...
                        </TableCell>
                      </TableRow>
                    ) : isSearchingArticles && articlesView === 'all' && searchLoading && searchResults === null ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Searching...
                        </TableCell>
                      </TableRow>
                    ) : filteredArticles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {articlesView === 'risk' ? 'Tidak ada artikel HIGH atau CRITICAL saat ini.' : 'No articles found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredArticles.map((article, idx) => {
                        const groupByMonth = articlesView === 'all' && !isSearchingArticles
                        const monthLabel = new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                        const prevMonthLabel = idx > 0
                          ? new Date(filteredArticles[idx - 1].createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : null
                        const showMonthHeader = groupByMonth && monthLabel !== prevMonthLabel
                        return (
                        <Fragment key={article.id}>
                        {showMonthHeader && (
                          <TableRow key={`month-${monthLabel}`} className="bg-muted/40 hover:bg-muted/40">
                            <TableCell colSpan={8} className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {monthLabel}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow key={article.id}>
                          <TableCell className="hidden sm:table-cell">
                            <div className="relative w-16 h-12 rounded overflow-hidden bg-muted">
                              {article.featuredImageUrl ? (
                                <Image
                                  src={article.featuredImageUrl}
                                  alt={article.featuredImageAlt || ''}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="font-medium line-clamp-1">{article.title}</p>
                            <p className="text-xs text-muted-foreground hidden md:block">{article.author?.name || 'Unknown'}</p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{article.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[article.status] ?? 'default'}>
                              {article.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${riskColors[article.riskLevel] ?? 'bg-gray-400'}`} />
                              <span className="text-sm">{article.riskScore}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">{article.viewCount}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {new Date(article.createdAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setRiskCheckResult(null); setRepairPopupArticle(article) }}
                                title="Repair Image / Check Fatality"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditArticle(article)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              {article.status !== 'PUBLISHED' ? (
                                <AsyncButton variant="ghost" size="icon" onClick={() => handlePublishArticle(article.id)} title="Publish">
                                  <Send className="h-4 w-4 text-green-500" />
                                </AsyncButton>
                              ) : (
                                <Button variant="ghost" size="icon" asChild title="View live article">
                                  <a href={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <AsyncButton variant="ghost" size="icon" onClick={() => handleDeleteArticle(article.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </AsyncButton>
                            </div>
                          </TableCell>
                        </TableRow>
                        </Fragment>
                        )
                      })
                    )}
                    {articlesView === 'all' && !isSearchingArticles && (
                      <TableRow ref={articlesSentinelRef}>
                        <TableCell colSpan={8} className="py-4 text-center text-xs text-muted-foreground">
                          {articlesLoadingMore ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" />Loading more...</>
                          ) : articlesHasMore ? (
                            <Button variant="ghost" size="sm" onClick={() => fetchMonthlyArticles()}>Load older articles</Button>
                          ) : filteredArticles.length > 0 ? (
                            'No more articles'
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={!!repairPopupArticle} onOpenChange={(open) => { if (!open) { setRepairPopupArticle(null); setRiskCheckResult(null) } }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="line-clamp-2">{repairPopupArticle?.title}</DialogTitle>
                  <DialogDescription>Pilih tindakan perbaikan untuk artikel ini.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                      Repair / Regenerate Image
                    </div>
                    <p className="text-sm text-muted-foreground">Ganti gambar utama artikel dengan gambar baru hasil AI.</p>
                    <AsyncButton
                      size="sm"
                      variant="outline"
                      onClick={() => repairPopupArticle && handleRepairImage(repairPopupArticle.id, repairPopupArticle.title)}
                    >
                      Regenerate Image
                    </AsyncButton>
                  </div>

                  <div className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      Check Fatality (Legal Risk)
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Periksa ulang isi artikel. Kalau hasilnya CRITICAL, AI otomatis memperbaiki bagian yang bermasalah
                      (hingga 3 percobaan) supaya risikonya turun dan artikel bisa dipublikasikan.
                    </p>
                    {repairPopupArticle && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Status saat ini:</span>
                        <div className={`w-2 h-2 rounded-full ${riskColors[repairPopupArticle.riskLevel] ?? 'bg-gray-400'}`} />
                        <span>{repairPopupArticle.riskLevel} ({repairPopupArticle.riskScore})</span>
                      </div>
                    )}
                    <AsyncButton
                      size="sm"
                      variant="outline"
                      onClick={() => repairPopupArticle && handleRepairRisk(repairPopupArticle.id)}
                    >
                      Check & Perbaiki Risiko
                    </AsyncButton>
                    {riskCheckResult && (
                      <div className={`text-sm p-2 rounded ${riskCheckResult.resolved ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {riskCheckResult.wasRewritten
                          ? `${riskCheckResult.before} → ${riskCheckResult.after}${riskCheckResult.resolved ? ' - selesai, siap dipublikasikan.' : ' - masih CRITICAL, perlu edit manual.'}`
                          : `Sudah dicek, risiko saat ini: ${riskCheckResult.after}. Tidak ada konten CRITICAL.`}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="trash">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" /> Trash
                </CardTitle>
                <CardDescription>
                  Artikel yang dihapus tersimpan di sini sebelum benar-benar dihapus permanen. Pulihkan kapan saja, atau hapus permanen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trashLoading && trashList === null ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
                  </div>
                ) : !trashList || trashList.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Trash kosong.</p>
                ) : (
                  <div className="space-y-2">
                    {trashList.map((article) => (
                      <div key={article.id} className="flex items-center justify-between p-3 border rounded bg-background/60">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{article.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {article.category} • dihapus {article.deletedAt ? new Date(article.deletedAt).toLocaleString('id-ID') : '-'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <AsyncButton variant="outline" size="sm" onClick={() => handleRestoreArticle(article.id)}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Restore
                          </AsyncButton>
                          <AsyncButton
                            variant="destructive"
                            size="sm"
                            onClick={() => handlePermanentDelete(article.id, article.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Hapus Permanen
                          </AsyncButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Email
                </CardTitle>
                <CardDescription>
                  Pesan dari Form Contact situs. Balasan dikirim via Resend dari {' '}
                  <span className="font-mono">contact@jurnal.kotabunan.com</span> - tidak perlu app password Gmail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
                  {/* List */}
                  <div className="border rounded-lg divide-y max-h-[600px] overflow-y-auto">
                    {contactLoading && contactSubmissions === null ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
                      </div>
                    ) : !contactSubmissions || contactSubmissions.length === 0 ? (
                      <p className="text-center py-12 text-muted-foreground text-sm">Belum ada pesan masuk.</p>
                    ) : (
                      contactSubmissions.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => openSubmission(sub)}
                          className={`w-full text-left p-3 hover:bg-muted transition-colors ${selectedSubmission?.id === sub.id ? 'bg-muted' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className={`text-sm truncate ${sub.status === 'UNREAD' ? 'font-semibold' : 'font-medium'}`}>{sub.name}</p>
                            {sub.status === 'UNREAD' && <Badge className="bg-blue-500 shrink-0">Baru</Badge>}
                            {sub.status === 'REPLIED' && <Badge variant="secondary" className="shrink-0">Dibalas</Badge>}
                            {sub.status === 'ARCHIVED' && <Badge variant="outline" className="shrink-0">Arsip</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{sub.subject}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(sub.createdAt).toLocaleString('id-ID')}</p>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Detail + Reply */}
                  <div>
                    {!selectedSubmission ? (
                      <div className="flex items-center justify-center h-full py-24 text-muted-foreground text-sm">
                        Pilih pesan di sebelah kiri untuk membaca & membalas.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedSubmission.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            Dari: {selectedSubmission.name} &lt;{selectedSubmission.email}&gt;
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(selectedSubmission.createdAt).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap">
                          {selectedSubmission.message}
                        </div>

                        {selectedSubmission.status === 'REPLIED' && selectedSubmission.replyMessage && (
                          <div className="p-4 border rounded-lg bg-green-500/10">
                            <p className="text-xs font-medium mb-1 text-muted-foreground">
                              Dibalas oleh {selectedSubmission.repliedBy}
                              {selectedSubmission.repliedAt && ` • ${new Date(selectedSubmission.repliedAt).toLocaleString('id-ID')}`}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{selectedSubmission.replyMessage}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Balas ke {selectedSubmission.email}</Label>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={6}
                            placeholder="Tulis balasan..."
                          />
                          <div className="flex gap-2">
                            <Button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}>
                              {sendingReply ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                              Kirim Balasan
                            </Button>
                            {selectedSubmission.status !== 'ARCHIVED' && (
                              <Button variant="outline" onClick={() => handleArchiveSubmission(selectedSubmission.id)}>
                                <Archive className="h-4 w-4 mr-2" /> Arsipkan
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid gap-6">
              <div>
                <h2 className="text-xl font-semibold">Metrics</h2>
                <p className="text-sm text-muted-foreground">Indikator performa konten di seluruh situs.</p>
              </div>

              {metricsLoading && !metrics ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat metrics...
                </div>
              ) : metrics ? (
                <>
                  {/* Totals */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                          <h3 className="text-2xl font-bold">{metrics.totals.views.toLocaleString()}</h3>
                        </div>
                        <Eye className="h-8 w-8 text-blue-500 opacity-20" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Likes</p>
                          <h3 className="text-2xl font-bold">{metrics.totals.likes.toLocaleString()}</h3>
                        </div>
                        <Heart className="h-8 w-8 text-red-500 opacity-20" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                          <h3 className="text-2xl font-bold">{metrics.totals.shares.toLocaleString()}</h3>
                        </div>
                        <Share2 className="h-8 w-8 text-green-500 opacity-20" />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Pencarian</p>
                          <h3 className="text-2xl font-bold">{metrics.totals.searches.toLocaleString()}</h3>
                        </div>
                        <Search className="h-8 w-8 text-purple-500 opacity-20" />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ranked lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> 10 Artikel Paling Banyak Dibuka</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.topViewed.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
                          <ol className="space-y-2">
                            {metrics.topViewed.map((a, i) => (
                              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                  <a href={`/article/${a.slug}`} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.title}</a>
                                </span>
                                <Badge variant="secondary" className="shrink-0">{a.viewCount.toLocaleString()}</Badge>
                              </li>
                            ))}
                          </ol>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4" /> Artikel Paling Banyak Like</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.topLiked.length === 0 || metrics.topLiked[0].likeCount === 0 ? <p className="text-sm text-muted-foreground">Belum ada like.</p> : (
                          <ol className="space-y-2">
                            {metrics.topLiked.filter(a => a.likeCount > 0).map((a, i) => (
                              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                  <a href={`/article/${a.slug}`} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.title}</a>
                                </span>
                                <Badge variant="secondary" className="shrink-0">{a.likeCount.toLocaleString()}</Badge>
                              </li>
                            ))}
                          </ol>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4" /> Artikel Paling Banyak Dibagikan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.topShared.length === 0 || metrics.topShared[0].shareCount === 0 ? <p className="text-sm text-muted-foreground">Belum ada share.</p> : (
                          <ol className="space-y-2">
                            {metrics.topShared.filter(a => a.shareCount > 0).map((a, i) => (
                              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                  <a href={`/article/${a.slug}`} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.title}</a>
                                </span>
                                <Badge variant="secondary" className="shrink-0">{a.shareCount.toLocaleString()}</Badge>
                              </li>
                            ))}
                          </ol>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Artikel Paling Banyak Dikomentari</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.topCommented.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada komentar.</p> : (
                          <ol className="space-y-2">
                            {metrics.topCommented.map((a, i) => (
                              <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                  <a href={`/article/${a.slug}`} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.title}</a>
                                </span>
                                <Badge variant="secondary" className="shrink-0">{a._count.comments.toLocaleString()}</Badge>
                              </li>
                            ))}
                          </ol>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> Kata Kunci Paling Banyak Dicari</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {metrics.topSearched.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada pencarian tercatat.</p> : (
                          <div className="flex flex-wrap gap-2">
                            {metrics.topSearched.map((s) => (
                              <Badge key={s.query} variant="outline" className="text-sm">
                                {s.query} <span className="ml-1.5 text-muted-foreground">({s.count})</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>Comment Moderation</CardTitle>
                <CardDescription>Review and moderate user comments with AI assistance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search comments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead className="hidden md:table-cell">User</TableHead>
                        <TableHead className="hidden lg:table-cell">Article</TableHead>
                        <TableHead className="hidden sm:table-cell">Toxicity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden xl:table-cell">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComments.map((comment) => (
                        <TableRow key={comment.id}>
                          <TableCell className="max-w-xs">
                            <p className="text-sm line-clamp-2">{comment.content}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              <p className="text-sm font-medium">{comment.user.name || 'Anonymous'}</p>
                              <p className="text-xs text-muted-foreground">{comment.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[150px] hidden lg:table-cell">
                            <p className="text-sm line-clamp-1">{comment.article.title}</p>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {comment.toxicityScore !== null ? (
                              <Badge variant={comment.toxicityScore > 0.5 ? 'destructive' : 'secondary'}>
                                {(comment.toxicityScore * 100).toFixed(0)}%
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusColors[comment.status]}>{comment.status}</Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {new Date(comment.createdAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <AsyncButton size="icon" variant="ghost" onClick={() => handleCommentAction(comment.id, 'approve')}>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </AsyncButton>
                              <AsyncButton size="icon" variant="ghost" onClick={() => handleCommentAction(comment.id, 'reject')}>
                                <XCircle className="h-4 w-4 text-red-500" />
                              </AsyncButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden lg:table-cell">Articles</TableHead>
                        <TableHead className="hidden lg:table-cell">Comments</TableHead>
                        <TableHead className="hidden xl:table-cell">Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || 'No name'}</TableCell>
                          <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleUserRoleChange(user.id, value)}
                            >
                              <SelectTrigger className="w-28">
                                <Badge variant={roleColors[user.role]}>{user.role}</Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USER">USER</SelectItem>
                                <SelectItem value="EDITOR">EDITOR</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{user._count?.articles || 0}</TableCell>
                          <TableCell className="hidden lg:table-cell">{user._count?.comments || 0}</TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {new Date(user.createdAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team (Redaksi)</CardTitle>
                    <CardDescription>Roster publik yang tampil di About Us dan halaman Editorial Team - kosong sampai diisi di sini, tidak ada data placeholder.</CardDescription>
                  </div>
                  <Button size="sm" onClick={openAddTeamMember}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Anggota
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Foto</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead className="hidden md:table-cell">Urutan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Memuat...
                        </TableCell>
                      </TableRow>
                    ) : teamMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada anggota tim. Klik &quot;Tambah Anggota&quot; untuk mulai isi Redaksi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      teamMembers.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                              {m.photoUrl ? (
                                <Image src={m.photoUrl} alt={m.name} fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex items-center justify-center h-full">
                                  <IdCard className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-muted-foreground">{m.role}</TableCell>
                          <TableCell className="hidden md:table-cell">{m.order}</TableCell>
                          <TableCell>
                            <Badge variant={m.isActive ? 'default' : 'outline'}>{m.isActive ? 'Tampil' : 'Disembunyikan'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditTeamMember(m)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AsyncButton variant="ghost" size="icon" onClick={() => handleDeleteTeamMember(m.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </AsyncButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTeamId ? 'Edit Anggota Tim' : 'Tambah Anggota Tim'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTeamMember} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0">
                      {teamForm.photoUrl ? (
                        <Image src={teamForm.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <IdCard className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={uploadingTeamPhoto}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleTeamPhotoUpload(file)
                        }}
                      />
                      {uploadingTeamPhoto && <p className="text-xs text-muted-foreground mt-1"><Loader2 className="h-3 w-3 animate-spin inline mr-1" />Mengunggah...</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Nama *</Label>
                    <Input id="teamName" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamRole">Jabatan *</Label>
                    <Input id="teamRole" value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} placeholder="Editor-in-Chief, Investigative Journalist, dll" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamBio">Bio Singkat</Label>
                    <Textarea id="teamBio" rows={3} value={teamForm.bio} onChange={(e) => setTeamForm({ ...teamForm, bio: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamOrder">Urutan Tampil</Label>
                      <Input id="teamOrder" type="number" value={teamForm.order} onChange={(e) => setTeamForm({ ...teamForm, order: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamActive">Status</Label>
                      <Select value={teamForm.isActive ? 'true' : 'false'} onValueChange={(v) => setTeamForm({ ...teamForm, isActive: v === 'true' })}>
                        <SelectTrigger id="teamActive"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Tampil di situs</SelectItem>
                          <SelectItem value="false">Disembunyikan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowTeamDialog(false)}>Batal</Button>
                    <Button type="submit" disabled={formSubmitting}>
                      {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Simpan
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Public Reports</CardTitle>
                    <CardDescription>Laporan/tips yang dikirim publik lewat halaman Submit Report.</CardDescription>
                  </div>
                  <Input
                    placeholder="Cari laporan..."
                    className="max-w-xs"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul</TableHead>
                      <TableHead className="hidden lg:table-cell">Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Kontak</TableHead>
                      <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.filter((r) => {
                      const q = searchQuery.toLowerCase()
                      return !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
                    }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada laporan masuk.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.filter((r) => {
                        const q = searchQuery.toLowerCase()
                        return !q || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
                      }).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="max-w-xs">
                            <p className="font-medium line-clamp-1">{r.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{r.content}</p>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{r.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select value={r.status} onValueChange={(v) => handleReportStatusChange(r.id, v)}>
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{r.sourceContact || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setViewingReport(r)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{viewingReport?.title}</DialogTitle>
                  <DialogDescription>
                    {viewingReport?.category} - {viewingReport && new Date(viewingReport.createdAt).toLocaleString('id-ID')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{viewingReport?.content}</p>
                  {viewingReport?.sourceContact && (
                    <p className="text-sm"><strong>Kontak:</strong> {viewingReport.sourceContact}</p>
                  )}
                  {viewingReport?.evidenceLinks && (
                    <div>
                      <p className="text-sm font-medium mb-1">Bukti/Link:</p>
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const links: string[] = JSON.parse(viewingReport.evidenceLinks)
                            return links.map((link, i) => (
                              <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block truncate">
                                {link}
                              </a>
                            ))
                          } catch {
                            return <p className="text-sm text-muted-foreground">{viewingReport.evidenceLinks}</p>
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="ads">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ad Slots</CardTitle>
                      <CardDescription>Definisikan ukuran & posisi slot iklan (standar IAB)</CardDescription>
                    </div>
                    <Dialog open={showAdSlotDialog} onOpenChange={setShowAdSlotDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Slot</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New Ad Slot</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateAdSlot} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nama Slot</Label>
                            <Input
                              value={adSlotForm.name}
                              onChange={(e) => setAdSlotForm({ ...adSlotForm, name: e.target.value })}
                              placeholder="Header Leaderboard"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Posisi</Label>
                              <Select
                                value={adSlotForm.position}
                                onValueChange={(v) => {
                                  const preset = AD_POSITIONS.find((p) => p.value === v)
                                  setAdSlotForm({
                                    ...adSlotForm,
                                    position: v,
                                    width: preset?.width ?? adSlotForm.width,
                                    height: preset?.height ?? adSlotForm.height,
                                  })
                                }}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {AD_POSITIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                      {p.label} ({p.width}x{p.height} px)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Device</Label>
                              <Select value={adSlotForm.device} onValueChange={(v) => setAdSlotForm({ ...adSlotForm, device: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['DESKTOP', 'MOBILE', 'BOTH'].map((d) => (
                                    <SelectItem key={d} value={d}>{d}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Width (px)</Label>
                              <Input
                                type="number"
                                value={adSlotForm.width}
                                onChange={(e) => setAdSlotForm({ ...adSlotForm, width: Number(e.target.value) })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Height (px)</Label>
                              <Input
                                type="number"
                                value={adSlotForm.height}
                                onChange={(e) => setAdSlotForm({ ...adSlotForm, height: Number(e.target.value) })}
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Harga per Hari (Rp) - opsional</Label>
                            <Input
                              type="number"
                              placeholder="Kosongkan jika slot ini khusus admin, tidak dijual ke advertiser"
                              value={adSlotForm.pricePerDay}
                              onChange={(e) => setAdSlotForm({ ...adSlotForm, pricePerDay: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Durasi Default (hari)</Label>
                            <Input
                              type="number"
                              min={1}
                              value={adSlotForm.defaultDurationDays}
                              onChange={(e) => setAdSlotForm({ ...adSlotForm, defaultDurationDays: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Dipakai untuk pre-fill tanggal saat advertiser memilih slot ini.</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Standar IAB: Leaderboard 728x90, Medium Rectangle 300x250, Mobile Banner 320x50.
                          </p>
                          <DialogFooter>
                            <Button type="submit" disabled={formSubmitting}>
                              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Save Slot
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Posisi</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Ukuran</TableHead>
                        <TableHead>Harga/Hari</TableHead>
                        <TableHead>Iklan Aktif</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adSlots.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{AD_POSITIONS.find((p) => p.value === s.position)?.label ?? s.position}</Badge>
                          </TableCell>
                          <TableCell>{s.device}</TableCell>
                          <TableCell>{s.width}x{s.height} px</TableCell>
                          <TableCell>
                            {s.pricePerDay != null
                              ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(s.pricePerDay)
                              : <span className="text-muted-foreground">Admin only</span>}
                          </TableCell>
                          <TableCell>{s.ads.filter((a) => a.isActive).length}</TableCell>
                          <TableCell className="text-right">
                            <AsyncButton variant="ghost" size="icon" onClick={() => handleDeleteAdSlot(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </AsyncButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {adSlots.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {adsLoading ? 'Loading...' : 'Belum ada ad slot. Buat satu dulu sebelum menambah iklan.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ads</CardTitle>
                      <CardDescription>Kelola iklan yang tayang (gambar atau video WebM/MP4)</CardDescription>
                    </div>
                    <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={adSlots.length === 0}>
                          <Plus className="h-4 w-4 mr-2" />New Ad
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New Ad</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateAd} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Ad Slot</Label>
                            <Select value={adForm.slotId} onValueChange={(v) => setAdForm({ ...adForm, slotId: v })}>
                              <SelectTrigger><SelectValue placeholder="Pilih slot" /></SelectTrigger>
                              <SelectContent>
                                {adSlots.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.width}x{s.height} px)</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Untuk Advertiser (opsional)</Label>
                            <Select
                              value={adForm.advertiserId || '_house'}
                              onValueChange={(v) => setAdForm({ ...adForm, advertiserId: v === '_house' ? '' : v })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_house">- (House Ad, tanpa invoice)</SelectItem>
                                {approvedAdvertisers.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>{a.companyName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {adForm.advertiserId
                                ? 'Iklan dibuat non-aktif dan invoice UNPAID otomatis dibuat - verifikasi di tab Invoices untuk mengaktifkan.'
                                : 'House ad langsung aktif, tanpa invoice, dikelola admin sepenuhnya.'}
                            </p>
                          </div>
                          {!adForm.advertiserId && (
                            <div className="space-y-2">
                              <Label>Nama Advertiser</Label>
                              <Input
                                value={adForm.advertiserName}
                                onChange={(e) => setAdForm({ ...adForm, advertiserName: e.target.value })}
                                required
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Link Tujuan (opsional)</Label>
                            <Input
                              type="url"
                              value={adForm.linkUrl}
                              onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Mulai</Label>
                              <Input
                                type="date"
                                value={adForm.startDate}
                                onChange={(e) => setAdForm({ ...adForm, startDate: e.target.value })}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Selesai</Label>
                              <Input
                                type="date"
                                value={adForm.endDate}
                                onChange={(e) => setAdForm({ ...adForm, endDate: e.target.value })}
                                required
                              />
                            </div>
                          </div>
                          {adForm.advertiserId && (() => {
                            const slot = adSlots.find((s) => s.id === adForm.slotId)
                            const days =
                              adForm.startDate && adForm.endDate
                                ? Math.max(1, Math.ceil((new Date(adForm.endDate).getTime() - new Date(adForm.startDate).getTime()) / (24 * 60 * 60 * 1000)))
                                : 0
                            const suggested = slot?.pricePerDay && days > 0 ? slot.pricePerDay * days : null
                            return (
                              <div className="space-y-2">
                                <Label>Nominal Invoice (Rp){slot?.pricePerDay == null && ' - wajib diisi, slot tidak punya harga default'}</Label>
                                <Input
                                  type="number"
                                  value={adForm.invoiceAmount}
                                  onChange={(e) => setAdForm({ ...adForm, invoiceAmount: e.target.value })}
                                  placeholder={suggested ? `Saran: ${suggested}` : 'Masukkan nominal'}
                                  required={slot?.pricePerDay == null}
                                />
                                {suggested && !adForm.invoiceAmount && (
                                  <p className="text-xs text-muted-foreground">Kosongkan untuk pakai saran otomatis ({suggested}).</p>
                                )}
                              </div>
                            )
                          })()}
                          <div className="space-y-2">
                            <Label>File (gambar atau video .webm/.mp4)</Label>
                            <Input
                              type="file"
                              accept="image/*,video/webm,video/mp4"
                              onChange={(e) => setAdFile(e.target.files?.[0] || null)}
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={formSubmitting}>
                              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Save Ad
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Advertiser</TableHead>
                        <TableHead>Slot</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads.map((ad) => (
                        <TableRow key={ad.id}>
                          <TableCell className="font-medium">
                            {ad.advertiserName}
                            {ad.advertiserId && <Badge variant="outline" className="ml-2 text-xs">self-service</Badge>}
                          </TableCell>
                          <TableCell>{ad.slot?.name}</TableCell>
                          <TableCell>{ad.mediaType}</TableCell>
                          <TableCell className="text-xs">
                            {new Date(ad.startDate).toLocaleDateString('id-ID')} - {new Date(ad.endDate).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {ad.invoice ? (
                              <>
                                <Badge variant={ad.invoice.status === 'PAID' ? 'default' : ad.invoice.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                  {ad.invoice.status}
                                </Badge>
                                <div className="text-muted-foreground mt-1">
                                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(ad.invoice.amount)}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={ad.isActive ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => handleToggleAdActive(ad.id, ad.isActive)}
                            >
                              {ad.isActive ? 'Active' : 'Paused'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditAd(ad)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AsyncButton variant="ghost" size="icon" onClick={() => handleDeleteAd(ad.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </AsyncButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {ads.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {adsLoading ? 'Loading...' : 'Belum ada iklan.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Dialog open={showEditAdDialog} onOpenChange={setShowEditAdDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Ad</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateAd} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nama Advertiser</Label>
                      <Input
                        value={editAdForm.advertiserName}
                        onChange={(e) => setEditAdForm({ ...editAdForm, advertiserName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link Tujuan (opsional)</Label>
                      <Input
                        type="url"
                        value={editAdForm.linkUrl}
                        onChange={(e) => setEditAdForm({ ...editAdForm, linkUrl: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mulai</Label>
                        <Input
                          type="date"
                          value={editAdForm.startDate}
                          onChange={(e) => setEditAdForm({ ...editAdForm, startDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Selesai</Label>
                        <Input
                          type="date"
                          value={editAdForm.endDate}
                          onChange={(e) => setEditAdForm({ ...editAdForm, endDate: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ganti Creative (opsional)</Label>
                      <Input
                        type="file"
                        accept="image/*,video/webm,video/mp4"
                        onChange={(e) => setEditAdFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">Kosongkan untuk pertahankan creative saat ini.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-ad-active"
                        checked={editAdForm.isActive}
                        onChange={(e) => setEditAdForm({ ...editAdForm, isActive: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="edit-ad-active" className="cursor-pointer">Aktif (tayang di situs)</Label>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={formSubmitting}>
                        {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Simpan Perubahan
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Harga per hari & durasi default tiap box iklan - langsung dipakai advertiser saat pesan iklan</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Slot</TableHead>
                      <TableHead>Posisi</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead>Harga per Hari (Rp)</TableHead>
                      <TableHead>Durasi Default (hari)</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adSlots.map((s) => {
                      const edit = pricingEdits[s.id]
                      const priceValue = edit?.pricePerDay ?? (s.pricePerDay?.toString() || '')
                      const durationValue = edit?.defaultDurationDays ?? s.defaultDurationDays.toString()
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{AD_POSITIONS.find((p) => p.value === s.position)?.label ?? s.position}</Badge>
                          </TableCell>
                          <TableCell>{s.width}x{s.height} px</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-32"
                              placeholder="Admin only"
                              value={priceValue}
                              onChange={(e) =>
                                setPricingEdits({ ...pricingEdits, [s.id]: { pricePerDay: e.target.value, defaultDurationDays: durationValue } })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="w-24"
                              value={durationValue}
                              onChange={(e) =>
                                setPricingEdits({ ...pricingEdits, [s.id]: { pricePerDay: priceValue, defaultDurationDays: e.target.value } })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" disabled={savingPricingId === s.id} onClick={() => handleSavePricing(s)}>
                              {savingPricingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {adSlots.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {adsLoading ? 'Loading...' : 'Belum ada slot iklan. Buat dulu di tab Ads.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advertisers">
            <Card>
              <CardHeader>
                <CardTitle>Advertisers</CardTitle>
                <CardDescription>Tinjau & setujui pendaftaran akun pengiklan self-service</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Perusahaan</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advertisers.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.companyName}</TableCell>
                        <TableCell className="text-xs">
                          {a.user.name}<br /><span className="text-muted-foreground">{a.user.email}</span>
                        </TableCell>
                        <TableCell>{a.phone}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === 'APPROVED' ? 'default' : a.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {a.status}
                          </Badge>
                          {a.status === 'REJECTED' && a.rejectionReason && (
                            <p className="text-xs text-muted-foreground mt-1">{a.rejectionReason}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {a.status !== 'APPROVED' && (
                            <AsyncButton size="sm" onClick={() => handleApproveAdvertiser(a.id)}>Approve</AsyncButton>
                          )}
                          {a.status !== 'REJECTED' && (
                            <AsyncButton size="sm" variant="outline" onClick={() => handleRejectAdvertiser(a.id)}>Reject</AsyncButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {advertisers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {advertisersLoading ? 'Loading...' : 'Belum ada pendaftar advertiser.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Verifikasi bukti transfer bank manual dari advertiser</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Advertiser</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Bukti</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">
                          <Link href={`/invoice/${inv.id}`} target="_blank" className="text-primary underline underline-offset-2 hover:no-underline">
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">
                          {inv.advertiser.companyName}<br /><span className="text-muted-foreground">{inv.advertiser.user.email}</span>
                        </TableCell>
                        <TableCell>{inv.ad?.slot?.name}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(inv.amount)}
                        </TableCell>
                        <TableCell>
                          {inv.proofUrl ? (
                            <a href={inv.proofUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">
                              Lihat
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {inv.status === 'VERIFYING' && (
                            <>
                              <AsyncButton size="sm" onClick={() => handleVerifyInvoicePaid(inv.id)}>Verifikasi Lunas</AsyncButton>
                              <AsyncButton size="sm" variant="outline" onClick={() => handleRejectInvoice(inv.id)}>Tolak</AsyncButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {invoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {invoicesLoading ? 'Loading...' : 'Belum ada invoice.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Command Center
                </CardTitle>
                <CardDescription>
                  Live terminal and control panel for autonomous news generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AiControls
                  onSuccess={(msg) => setSuccess(msg)}
                  onError={(msg) => setError(msg)}
                  onRefresh={fetchAllData}
                />
              </CardContent>
            </Card>

            {/* Agent Memory - previously 100% invisible: the data existed
                and was actively being written to (see src/lib/ai/memory.ts,
                used by analyzeLegalRisk) but nothing anywhere let anyone
                see or manage it. */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Agent Memory
                </CardTitle>
                <CardDescription>
                  Memori semantik yang diingat AI dari keputusan-keputusan masa lalu (pgvector) - dipakai supaya penilaian risiko hukum & penulisan artikel konsisten dengan preseden sebelumnya. Total: {agentMemoriesTotal} memori.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {agentMemoriesByAgent.map((a) => (
                    <Badge key={a.agentKey} variant="secondary">{a.agentKey}: {a.count}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Select value={memoryAgentFilter} onValueChange={(v) => { setMemoryAgentFilter(v); }}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Semua Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Agent</SelectItem>
                      <SelectItem value="WIE">WIE</SelectItem>
                      <SelectItem value="WUE">WUE</SelectItem>
                      <SelectItem value="AUDY">AUDY</SelectItem>
                      <SelectItem value="AS">AS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Cari isi memory..."
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAgentMemories()}
                    className="max-w-xs"
                  />
                  <AsyncButton variant="outline" onClick={fetchAgentMemories}>
                    <Search className="h-4 w-4 mr-2" /> Cari
                  </AsyncButton>
                </div>

                {memoriesLoading && agentMemories === null ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat...
                  </div>
                ) : !agentMemories || agentMemories.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Belum ada memory.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {agentMemories.map((m) => (
                      <div key={m.id} className="flex items-start justify-between gap-3 p-3 border rounded bg-background/60">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{m.agentKey}</Badge>
                            {m.category && <Badge variant="secondary" className="text-xs">{m.category}</Badge>}
                            <span className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString('id-ID')}</span>
                          </div>
                          <p className="text-sm">{m.content}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteMemory(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company & Bank Info (untuk Invoice)</CardTitle>
                  <CardDescription>Data ini dipakai di invoice pengiklan & ditampilkan sebagai info rekening transfer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nama Perusahaan</Label>
                      <Input
                        value={companySettings.companyName}
                        onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>NPWP (opsional)</Label>
                      <Input
                        value={companySettings.npwp}
                        onChange={(e) => setCompanySettings({ ...companySettings, npwp: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Alamat</Label>
                      <Input
                        value={companySettings.address}
                        onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telepon</Label>
                      <Input
                        value={companySettings.phone}
                        onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nama Bank</Label>
                      <Input
                        value={companySettings.bankName}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankName: e.target.value })}
                        placeholder="BCA / Mandiri / BNI ..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nomor Rekening</Label>
                      <Input
                        value={companySettings.bankAccountNo}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankAccountNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Atas Nama Rekening</Label>
                      <Input
                        value={companySettings.bankAccountName}
                        onChange={(e) => setCompanySettings({ ...companySettings, bankAccountName: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveCompanySettings} disabled={savingCompanySettings}>
                    {savingCompanySettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Simpan
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site Name</Label>
                      <Input defaultValue="Jurnal Kotabunan" />
                    </div>
                    <div className="space-y-2">
                      <Label>Site URL</Label>
                      <Input defaultValue="https://jurnal.kotabunan.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Admin Email</Label>
                      <Input defaultValue="admin@jurnal.kotabunan.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Language</Label>
                      <Select defaultValue="id">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id">Indonesian</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button>Save Settings</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Publish Lock Rules</CardTitle>
                  <CardDescription>Requirements for article publication</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Featured image required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Image alt text required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Image source required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Minimum 1 evidence document</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Legal review required for HIGH risk articles</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Level Thresholds</CardTitle>
                  <CardDescription>Legal risk scoring configuration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="font-medium">LOW</span>
                      </div>
                      <p className="text-sm text-muted-foreground">0-30</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="font-medium">MEDIUM</span>
                      </div>
                      <p className="text-sm text-muted-foreground">31-60</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="font-medium">HIGH</span>
                      </div>
                      <p className="text-sm text-muted-foreground">61-80</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium">CRITICAL</span>
                      </div>
                      <p className="text-sm text-muted-foreground">81-100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-500">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
                    <div>
                      <p className="font-medium">Reset Database</p>
                      <p className="text-sm text-muted-foreground">Delete all articles and reset content</p>
                    </div>
                    <Button variant="destructive">Reset</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <AdminChatWidget onRefresh={fetchAllData} />
      </SidebarInset>
    </SidebarProvider>
  )
}
