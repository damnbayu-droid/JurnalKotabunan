import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, FileText, Users, Eye, CheckCircle, AlertTriangle } from 'lucide-react'
import { COMPANY_NAME } from '@/lib/site-config'

export const metadata = {
  title: 'Transparency - Jurnal Kotabunan',
  description: 'Jurnal Kotabunan\'s transparency report - editorial stats and accountability.',
  alternates: {
    canonical: '/transparency',
  },
}

async function getStats() {
  const [totalArticles, publishedArticles, totalComments, totalUsers] = await Promise.all([
    db.article.count(),
    db.article.count({ where: { status: 'PUBLISHED' } }),
    db.comment.count({ where: { status: 'APPROVED' } }),
    db.user.count(),
  ])

  return { totalArticles, publishedArticles, totalComments, totalUsers }
}

export const revalidate = 3600 // ISR: 1 hour

export default async function TransparencyPage() {
  const stats = await getStats()

  return (
    <div className="py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Transparency</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jurnal Kotabunan is committed to full transparency in editorial processes, 
            funding, and platform governance.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.publishedArticles}</p>
              <p className="text-sm text-muted-foreground">Published Articles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Registered Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalComments}</p>
              <p className="text-sm text-muted-foreground">Comments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">100%</p>
              <p className="text-sm text-muted-foreground">Evidence-Based</p>
            </CardContent>
          </Card>
        </div>

        {/* Editorial Standards */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Editorial Standards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline">1</Badge>
                <div>
                  <p className="font-medium">Evidence-Based</p>
                  <p className="text-sm text-muted-foreground">
                    Every article must be supported by at least 1 verified evidence.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">2</Badge>
                <div>
                  <p className="font-medium">Tone Neutrality</p>
                  <p className="text-sm text-muted-foreground">
                    Articles use neutral language without emotional adjectives or direct accusations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">3</Badge>
                <div>
                  <p className="font-medium">Legal Review</p>
                  <p className="text-sm text-muted-foreground">
                    High-risk articles must undergo legal review before publication.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline">4</Badge>
                <div>
                  <p className="font-medium">Open Sources</p>
                  <p className="text-sm text-muted-foreground">
                    All sources and supporting evidence are displayed transparently on every article.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Levels */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Legal Risk Levels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium text-sm">LOW (0-30)</p>
                  <p className="text-xs text-muted-foreground">
                    Low risk, can be published directly
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div>
                  <p className="font-medium text-sm">MEDIUM (31-60)</p>
                  <p className="text-xs text-muted-foreground">
                    Medium risk, editorial review recommended
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <div>
                  <p className="font-medium text-sm">HIGH (61-80)</p>
                  <p className="text-xs text-muted-foreground">
                    High risk, legal review required
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div>
                  <p className="font-medium text-sm">CRITICAL (81-100)</p>
                  <p className="text-xs text-muted-foreground">
                    Critical risk, cannot be published
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funding */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Funding Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <span>Ads</span>
                <Badge variant="secondary">Display placements only</Badge>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Jurnal Kotabunan is funded through paid advertising - banner and display placements from
                vetted advertisers (see our <a href="/ads" className="text-primary hover:underline">Advertise
                With Us</a> page). Advertising is a pure display placement, never editorial content, and
                carries no influence over which stories we cover or how we report them.
              </p>
              <p className="text-sm text-muted-foreground">
                We do not accept sponsorships - arrangements that tie payment to editorial coverage,
                endorsement, or political backing. Jurnal Kotabunan is published by {COMPANY_NAME}.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              For questions about transparency or editorial claims:
            </p>
            <div className="space-y-1">
              <p className="text-sm"><strong>Email:</strong> info@jurnal.kotabunan.com</p>
              <p className="text-sm"><strong>Address:</strong> Kotabunan, Bolaang Mongondow Timur, Sulawesi Utara, Indonesia</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
