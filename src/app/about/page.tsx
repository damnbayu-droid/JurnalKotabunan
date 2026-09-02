import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Shield, Users, FileText, Target, Eye, Heart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'

export const metadata = {
  title: 'About Us - Jurnal Kotabunan',
  description: 'Learn about Jurnal Kotabunan\'s mission, team, and editorial standards.',
  alternates: {
    canonical: '/about',
  },
}

const values = [
  {
    icon: Shield,
    title: 'Integrity',
    description: 'Maintaining truth and accuracy in every report.',
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'Open about processes, sources, and funding.',
  },
  {
    icon: Target,
    title: 'Accountability',
    description: 'Responsible for every published content.',
  },
  {
    icon: Heart,
    title: 'Independence',
    description: 'Free from political and commercial influence.',
  },
]

export default async function AboutPage() {
  const teamMembers = await db.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">About Jurnal Kotabunan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            An independent investigative journalism platform for Kotabunan, 
            committed to evidence-based news and high ethical standards.
          </p>
        </div>

        {/* Mission */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Jurnal Kotabunan exists to deliver high-quality investigative journalism 
              focused on important issues in Kotabunan and Bolaang Mongondow Timur. We believe the public has the right 
              to receive accurate, balanced, and accountable information.
            </p>
            <Separator className="my-4" />
            <p className="text-muted-foreground leading-relaxed">
              Using AI technology for legal risk analysis and content moderation, 
              we ensure every article meets Indonesian legal and journalistic ethics standards.
            </p>
          </CardContent>
        </Card>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {values.map((value) => (
            <Card key={value.title}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <value.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Our Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Team roster coming soon. See our{' '}
                <Link href="/editorial-team" className="text-primary hover:underline">
                  Editorial Team
                </Link>{' '}
                page for updates.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.slice(0, 6).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                      {member.photoUrl ? (
                        <Image src={member.photoUrl} alt={member.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm font-medium text-muted-foreground">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {teamMembers.length > 0 && (
              <div className="mt-4 text-center">
                <Link href="/editorial-team" className="text-sm text-primary hover:underline">
                  View full Editorial Team →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technology */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Technology & AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Jurnal Kotabunan uses AI technology to support the editorial process:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border text-center">
                <p className="font-medium text-sm">Legal Risk Analysis</p>
                <p className="text-xs text-muted-foreground">ITE & Press Law</p>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <p className="font-medium text-sm">Comment Moderation</p>
                <p className="text-xs text-muted-foreground">SARA & Defamation</p>
              </div>
              <div className="p-3 rounded-lg border text-center">
                <p className="font-medium text-sm">Tone Control</p>
                <p className="text-xs text-muted-foreground">Editorial Neutrality</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Join Us</h2>
          <p className="text-muted-foreground">
            Become part of the independent investigative journalism community in Kotabunan.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button>Register Now</Button>
            </Link>
            <Link href="/submit-report">
              <Button variant="outline">Submit Report</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
