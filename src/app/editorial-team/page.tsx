import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'
import Image from 'next/image'
import { db } from '@/lib/db'
import { COMPANY_NAME } from '@/lib/site-config'

export const metadata = {
  title: 'Editorial Team - Jurnal Kotabunan',
  description: 'The editorial team behind Jurnal Kotabunan.',
  alternates: {
    canonical: '/editorial-team',
  },
}

export const revalidate = 3600

export default async function EditorialTeamPage() {
  const teamMembers = await db.teamMember.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Editorial Team</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jurnal Kotabunan is published by {COMPANY_NAME}. Our editorial team is responsible for every
            article published under the Jurnal Kotabunan name.
          </p>
        </div>

        {teamMembers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3" />
              <p>Our team roster is being updated. Please check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="pt-6 text-center">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted mx-auto mb-3">
                    {member.photoUrl ? (
                      <Image src={member.photoUrl} alt={member.name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-lg font-medium text-muted-foreground">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  {member.bio && <p className="text-xs text-muted-foreground">{member.bio}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
