'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles, Activity, Brain, FileText, Zap, CheckCircle2 } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface AiControlsProps {
    onSuccess: (message: string) => void
    onError: (message: string) => void
    onRefresh: () => void
}

export function AiControls({ onSuccess, onError, onRefresh }: AiControlsProps) {
    const [loading, setLoading] = useState(false)
    const [articleCount, setArticleCount] = useState('3')
    const [viralCategory, setViralCategory] = useState('random')
    const [rewriteUrl, setRewriteUrl] = useState('')
    const [rewriteProgress, setRewriteProgress] = useState<string[]>([])
    const [rawData, setRawData] = useState('')

    // Auto-publish state
    const [autoPublish, setAutoPublish] = useState(false)
    const [settingsLoading, setSettingsLoading] = useState(true)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/ai/settings')
            if (res.ok) {
                const data = await res.json()
                setAutoPublish(data.autoPublish)
            }
        } catch (error) {
            console.error('Failed to fetch AI settings', error)
        } finally {
            setSettingsLoading(false)
        }
    }

    const toggleAutoPublish = async () => {
        const newState = !autoPublish
        // Optimistic update
        setAutoPublish(newState)

        try {
            const res = await fetch('/api/ai/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ autoPublish: newState })
            })

            if (!res.ok) {
                throw new Error('Failed to update settings')
            }

            onSuccess(newState ? 'Auto-publish enabled' : 'Auto-publish disabled')
        } catch (error) {
            setAutoPublish(!newState) // Revert on error
            onError('Failed to update auto-publish settings')
        }
    }

    const handleGenerate = async () => {
        const count = parseInt(articleCount)
        if (isNaN(count) || count < 1) {
            onError('Please enter a valid number of articles (1-10)')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/ai/generate-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    count,
                    autoPublish // Use the state variable
                })
            })
            const data = await res.json()
            if (res.ok) {
                onSuccess(`✅ Generated ${data.count} articles successfully!`)
                onRefresh()
            } else {
                onError(data.error || 'Failed to generate articles')
            }
        } catch (err) {
            onError('Failed to generate articles')
        } finally {
            setLoading(false)
        }
    }

    const handleDiscoverViral = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/ai/discover-viral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: viralCategory === 'random' ? null : viralCategory,
                    autoPublish // Use the state variable instead of hardcoded true
                })
            })
            const data = await res.json()
            if (res.ok) {
                onSuccess(`🔥 Discovered and created: "${data.article.title}"!`)
                onRefresh()
            } else {
                onError(data.error || 'Failed to discover viral news')
            }
        } catch (err) {
            onError('Failed to discover viral news')
        } finally {
            setLoading(false)
        }
    }

    const handleRewrite = async () => {
        if (!rewriteUrl) {
            onError('Please enter a URL')
            return
        }
        setLoading(true)
        setRewriteProgress([])
        try {
            const res = await fetch('/api/ai/rewrite-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: rewriteUrl,
                    autoPublish // Use the state variable
                })
            })

            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}))
                onError(data.error || 'Failed to rewrite article')
                return
            }

            // Parse the Server-Sent Events stream as it arrives - each
            // "progress" event is one real pipeline checkpoint (fetch done,
            // AI rewrite done, image generated, saved), not a simulated timer.
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                const events = buffer.split('\n\n')
                buffer = events.pop() || ''

                for (const raw of events) {
                    if (!raw.trim()) continue
                    const eventType = raw.match(/^event: (.+)$/m)?.[1]?.trim() || 'message'
                    const dataLine = raw.match(/^data: (.+)$/m)?.[1]?.trim()
                    if (!dataLine) continue
                    const data = JSON.parse(dataLine)

                    if (eventType === 'progress') {
                        setRewriteProgress((prev) => [...prev, data.stage])
                    } else if (eventType === 'done') {
                        onSuccess(`✅ Article rewritten successfully!`)
                        onRefresh()
                        setRewriteUrl('')
                    } else if (eventType === 'error') {
                        onError(data.error || 'Failed to rewrite article')
                    }
                }
            }
        } catch (err) {
            onError('Failed to rewrite article')
        } finally {
            setLoading(false)
        }
    }

    const handleProcessRawData = async () => {
        if (!rawData) return
        setLoading(true)
        try {
            const res = await fetch('/api/ai/process-raw-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: rawData,
                    autoPublish
                })
            })
            const data = await res.json()
            if (res.ok) {
                onSuccess(`✅ Raw data processed into article: "${data.article.title}"`)
                onRefresh()
                setRawData('')
            } else {
                onError(data.error || 'Failed to process raw data')
            }
        } catch (err) {
            onError('Failed to process data')
        } finally {
            setLoading(false)
        }
    }

    // Live Activity Log State
    const [logs, setLogs] = useState<any[]>([])
    const [refreshingLogs, setRefreshingLogs] = useState(false)

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 5000) // Poll every 5s
        return () => clearInterval(interval)
    }, [])

    const fetchLogs = async () => {
        setRefreshingLogs(true)
        try {
            const res = await fetch('/api/ai/activity')
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
            }
        } catch (error) {
            console.error('Failed to fetch activity logs', error)
        } finally {
            setRefreshingLogs(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Auto-Publish Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                <div>
                    <Label htmlFor="auto-publish" className="text-base font-medium">
                        Auto-Publish AI Articles
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Automatically publish created articles without manual review
                    </p>
                </div>
                <Button
                    variant={autoPublish ? "default" : "outline"}
                    onClick={toggleAutoPublish}
                    disabled={settingsLoading}
                    className={autoPublish ? "bg-green-600 hover:bg-green-700" : ""}
                >
                    {settingsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        autoPublish ? "Enabled" : "Disabled"
                    )}
                </Button>
            </div>

            {/* Manual Generation */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Label htmlFor="article-count">Number of Articles</Label>
                    <Input
                        id="article-count"
                        type="number"
                        min="1"
                        max="10"
                        value={articleCount}
                        onChange={(e) => setArticleCount(e.target.value)}
                        placeholder="3"
                    />
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={handleGenerate}
                        className="w-full md:w-auto gap-2"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Generate Now
                    </Button>
                </div>
            </div>

            {/* Viral Discovery */}
            <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    🔥 Discover & Recreate Viral News
                </h4>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Label htmlFor="viral-category">Category (Optional)</Label>
                        <Select value={viralCategory} onValueChange={setViralCategory}>
                            <SelectTrigger id="viral-category">
                                <SelectValue placeholder="Random Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="random">Random Category</SelectItem>
                                <SelectItem value="GOVERNMENT">Pemerintahan</SelectItem>
                                <SelectItem value="TOURISM">Pariwisata</SelectItem>
                                <SelectItem value="INVESTMENT">Investasi</SelectItem>
                                <SelectItem value="INCIDENTS">Insiden</SelectItem>
                                <SelectItem value="ENVIRONMENT">Lingkungan Hidup</SelectItem>
                                <SelectItem value="PANANG">Panang</SelectItem>
                                <SelectItem value="INTERNATIONAL">Internasional</SelectItem>
                                <SelectItem value="TECHNOLOGY">Teknologi</SelectItem>
                                <SelectItem value="OPINION">Opini</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button
                            onClick={handleDiscoverViral}
                            className="w-full md:w-auto gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                            Find & Publish
                        </Button>
                    </div>
                </div>
            </div>

            {/* Raw Data Processor */}
            <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Process Raw Data (5W1H)
                </h4>
                <div className="space-y-2">
                    <Label htmlFor="raw-data" className="text-xs text-muted-foreground">
                        Paste press release, notes, or raw event data here. AI will structure it into a news article.
                    </Label>
                    <div className="flex gap-4 items-start">
                        <Textarea
                            id="raw-data"
                            placeholder="Who, What, When, Where, Why, How..."
                            value={rawData}
                            onChange={(e) => setRawData(e.target.value)}
                            className="min-h-[100px] flex-1"
                        />
                        <Button
                            onClick={handleProcessRawData}
                            disabled={loading || !rawData}
                            className="h-auto py-4"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Rewriter */}
            <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Rewrite External News
                </h4>
                <div className="flex gap-4">
                    <Input
                        placeholder="https://example.com/news-article"
                        value={rewriteUrl}
                        onChange={(e) => setRewriteUrl(e.target.value)}
                        className="flex-1"
                    />
                    <Button
                        onClick={handleRewrite}
                        disabled={loading || !rewriteUrl}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Rewrite
                    </Button>
                </div>

                {/* Live progress - one line per real pipeline checkpoint, streamed
                    via Server-Sent Events as each step actually completes. */}
                {rewriteProgress.length > 0 && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                        {rewriteProgress.map((stage, i) => (
                            <div key={i} className="flex items-center gap-2 text-foreground">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                <span>{stage}</span>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                <span>Memproses...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Repair Tools */}
            <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    System Restoration
                </h4>
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={async () => {
                            setLoading(true)
                            try {
                                const res = await fetch('/api/ai/assistant', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'repair-all-images' })
                                })
                                if (res.ok) {
                                    onSuccess('✅ Image repair process started. Check terminal.')
                                    onRefresh()
                                } else {
                                    onError('Failed to start repair')
                                }
                            } catch (e) {
                                onError('Error starting repair')
                            } finally {
                                setLoading(false)
                            }
                        }}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        🔧 Repair All Broken Images
                    </Button>
                </div>
            </div>

            {/* Live Terminal */}
            <div className="border border-slate-700 bg-slate-950 rounded-lg overflow-hidden mt-6">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="ml-2 text-xs font-mono text-slate-400">jurnalkotabunan-ai-terminal — bash — 80x24</span>
                    </div>
                    {refreshingLogs && <Loader2 className="h-3 w-3 text-slate-500 animate-spin" />}
                </div>
                <div className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-2">
                    {logs.length === 0 ? (
                        <div className="text-slate-500 italic">Waiting for AI activity...</div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-2">
                                <span className="text-slate-500">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                <span className={log.success ? "text-green-400" : "text-red-400"}>
                                    {log.success ? "✓" : "✗"}
                                </span>
                                <span className="text-blue-400">{log.action.toUpperCase()}</span>
                                <span className="text-slate-300">
                                    {log.action === 'discover-viral' && `Discovered viral topic: ${log.metadata?.trendingTopic || 'Unknown'}`}
                                    {log.action === 'rewrite' && `Rewrote article from: ${log.metadata?.sourceUrl || 'URL'}`}
                                    {log.action === 'generate' && `Generated ${log.category} article`}
                                    {log.action === 'process-raw-data' && `Processed raw data into article`}
                                </span>
                            </div>
                        ))
                    )}
                    <div className="animate-pulse text-green-500">_</div>
                </div>
            </div>
        </div>
    )
}
