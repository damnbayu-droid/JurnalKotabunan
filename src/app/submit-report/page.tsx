'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Send, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

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

export default function SubmitReportPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    sourceContact: '',
    evidenceLinks: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          content: formData.content,
          sourceContact: formData.sourceContact,
          evidenceLinks: formData.evidenceLinks.split('\n').filter(Boolean),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      // Also forward to Formspree as requested
      try {
        await fetch('https://formspree.io/f/mzdaeqda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `New Report: ${formData.title}`,
            category: formData.category,
            message: formData.content,
            contact: formData.sourceContact,
            links: formData.evidenceLinks,
            _replyto: formData.sourceContact // if it's an email
          }),
        })
      } catch (formspreeError) {
        console.error('Formspree forwarding failed', formspreeError)
        // We don't block success if DB save worked, just log it
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Report Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for your report. Our investigative team will review this submission.
            </p>
            <Button onClick={() => router.push('/')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Report</h1>
          <p className="text-muted-foreground">
            Submit information or reports to our investigative team
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">Identity Protected</h3>
              <p className="text-xs text-muted-foreground">
                Your identity will be kept confidential according to investigative journalism standards.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
            <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-sm">Evidence Important</h3>
              <p className="text-xs text-muted-foreground">
                Include documents, photos, or supporting evidence to strengthen your report.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Form</CardTitle>
            <CardDescription>
              Fill in all relevant information for your report
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Report Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief title of your report"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="content">Report Description *</Label>
                <Textarea
                  id="content"
                  placeholder="Describe your report in detail, including who, what, when, where, and why..."
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidenceLinks">Supporting Evidence Links</Label>
                <Textarea
                  id="evidenceLinks"
                  placeholder="Enter links to documents, photos, or videos (one per line)"
                  rows={3}
                  value={formData.evidenceLinks}
                  onChange={(e) => setFormData({ ...formData, evidenceLinks: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Google Drive, Dropbox, or other file sharing services
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceContact">Contact (Optional)</Label>
                <Input
                  id="sourceContact"
                  placeholder="Email or phone number to be contacted"
                  value={formData.sourceContact}
                  onChange={(e) => setFormData({ ...formData, sourceContact: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Contact information will be kept confidential
                </p>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
