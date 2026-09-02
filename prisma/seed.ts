import { db } from '../src/lib/db'
import { hash } from 'bcryptjs'

async function main() {
  console.log('🗑️  Deleting existing articles...')
  await db.article.deleteMany({})
  console.log('✅ Existing articles deleted\n')

  // Create admin user
  const hashedPassword = await hash('@Lcf210492', 12)
  const admin = await db.user.upsert({
    where: { email: 'baliminor2009@gmail.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'baliminor2009@gmail.com',
      password: hashedPassword,
      name: 'Admin NewsBali',
      role: 'ADMIN',
    },
  })

  console.log('Created admin user:', admin.email)

  // Create editor user
  const editorPassword = await hash('editor123', 12)
  const editor = await db.user.upsert({
    where: { email: 'editor@newsbali.online' },
    update: {},
    create: {
      email: 'editor@newsbali.online',
      password: editorPassword,
      name: 'Editor NewsBali',
      role: 'EDITOR',
    },
  })

  console.log('Created editor user:', editor.email)

  // Create dummy articles
  const articles = [
    // TOURISM
    {
      title: 'Bali Government Tightens Hotel Construction Rules in Coastal Areas',
      slug: 'bali-government-tightens-hotel-construction-rules-coastal-areas',
      excerpt: 'The Bali Provincial Government has issued new regulations limiting hotel and resort development in coastal areas to protect marine and beach ecosystems.',
      content: `<p>The Bali Provincial Government has issued new regulations that significantly restrict hotel and resort construction in the island\'s coastal areas to protect increasingly threatened marine and beach ecosystems.</p>`,
      category: 'TOURISM' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200',
      featuredImageAlt: 'Bali beach with hotels in the background',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 15,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 2,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'Ubud Food Festival 2025 Ready to Launch Next Month',
      slug: 'ubud-food-festival-2025-ready-launch-next-month',
      excerpt: 'Bali\'s largest culinary festival will feature 100 chefs from various countries to enliven this international gastronomy event.',
      content: `<p>The Ubud Food Festival returns to Bali with the theme "Culinary Heritage of the Islands". The festival will showcase more than 100 chefs from Indonesia and abroad.</p><p>The event runs for 3 full days featuring cooking competitions, workshops, and exhibitions of local culinary products.</p>`,
      category: 'TOURISM' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200',
      featuredImageAlt: 'Culinary festival with various foods',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 5,
      containsAccusation: false,
      verificationLevel: 'MEDIUM' as const,
      evidenceCount: 1,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
    },

    // INVESTMENT
    {
      title: 'Foreign Investors Interested in Renewable Energy Project in East Bali',
      slug: 'foreign-investors-interested-renewable-energy-project-east-bali',
      excerpt: 'Several investors from Europe and Japan have shown interest in developing a solar power plant project in the East Bali region with a total investment of IDR 2 trillion.',
      content: `<p>Several investors from Europe and Japan have shown serious interest in developing a solar power plant (PLTS) project in the East Bali region with a planned total investment of IDR 2 trillion.</p>`,
      category: 'INVESTMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200',
      featuredImageAlt: 'Solar panels in Bali',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 10,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 1,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      title: 'Bali Digital Startup Secures Series A Funding of IDR 50 Billion',
      slug: 'bali-digital-startup-secures-series-a-funding-50-billion',
      excerpt: 'A local e-commerce platform focusing on Bali handicraft products has successfully secured funding from Singapore venture capital for regional expansion.',
      content: `<p>BaliCraft, a startup e-commerce platform connecting Bali artisans with global markets, announced Series A funding worth IDR 50 billion from East Ventures and Alpha JWC Ventures.</p><p>The funds will be used for technology development, expansion to ASEAN countries, and empowering 5,000 local artisans.</p>`,
      category: 'INVESTMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
      featuredImageAlt: 'Startup team working with laptops',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 8,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 2,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 172800000), // 2 days ago
    },

    // INCIDENTS
    {
      title: 'Fire at Kumbasari Market Successfully Extinguished, No Casualties',
      slug: 'fire-kumbasari-market-successfully-extinguished-no-casualties',
      excerpt: 'A fire that occurred at Kumbasari Market in Denpasar this morning was extinguished after 3 hours. 25 stalls were affected with estimated losses of IDR 2 billion.',
      content: `<p>A fire struck Kumbasari Market in Denpasar this morning at around 05:30 WITA. Firefighters deployed 8 fire trucks to extinguish the blaze that engulfed 25 stalls in the traditional market area.</p><p>The Head of Denpasar Fire Department stated the fire was brought under control at 08:45 WITA. There were no casualties in this incident, however material losses are estimated at IDR 2 billion.</p><p>The cause of the fire is still under investigation, but is suspected to have originated from an electrical short circuit in one of the stalls.</p>`,
      category: 'INCIDENTS' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1577386216098-de8edd6af8f0?w=1200',
      featuredImageAlt: 'Fire truck',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'MEDIUM' as const,
      riskScore: 35,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 3,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      title: 'Mount Agung Raises Activity Status to Level II',
      slug: 'mount-agung-raises-activity-status-level-two',
      excerpt: 'PVMBG raised Mount Agung\'s status from Normal (Level I) to Alert (Level II) after increased volcanic activity over the past week.',
      content: `<p>The Center for Volcanology and Geological Hazard Mitigation (PVMBG) officially raised Mount Agung\'s status from Level I (Normal) to Level II (Alert) today.</p><p>This decision was made after monitoring showed an increase in volcanic earthquakes and tremors over the past 7 days. However, there are no signs of an imminent eruption.</p><p>The public is advised to remain calm but vigilant, and not to conduct any climbing activities to the crater within a 2 km radius from the peak.</p>`,
      category: 'INCIDENTS' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=1200',
      featuredImageAlt: 'Mount Agung Bali',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'HIGH' as const,
      riskScore: 65,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 4,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 10800000), // 3 hours ago
    },

    // LOCAL
    {
      title: 'Denpasar Launches Smart City Program to Improve Public Services',
      slug: 'denpasar-launches-smart-city-program-improve-public-services',
      excerpt: 'Denpasar City Government officially launched the Smart City program by integrating various public services through a mobile application.',
      content: `<p>Denpasar Mayor inaugurated the Smart City program that will integrate 15 public services in one mobile application called "Denpasar Cerdas" (Smart Denpasar).</p><p>Available services include tax payments, business permits, public complaints, traffic information, and garbage collection schedules.</p><p>This program is the result of collaboration with local technology companies with a budget of IDR 15 billion and targeted for completion within 6 months.</p>`,
      category: 'GOVERNMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200',
      featuredImageAlt: 'Modern city with technology',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 12,
      containsAccusation: false,
      verificationLevel: 'MEDIUM' as const,
      evidenceCount: 2,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 259200000), // 3 days ago
    },
    {
      title: 'Traditional Community in Ubud Revitalizes Subak for Sustainable Tourism',
      slug: 'traditional-community-ubud-revitalizes-subak-sustainable-tourism',
      excerpt: 'The indigenous community in Ubud is developing educational tourism based on the subak irrigation system recognized by UNESCO as a world cultural heritage.',
      content: `<p>Banjar Adat Tegallalang in Ubud launched an educational tourism program that introduces the traditional subak irrigation system to tourists.</p><p>The program involves local farmers as guides who explain the Tri Hita Karana philosophy in managing the terraced rice fields famous in the area.</p><p>This initiative aims to preserve traditional agricultural culture while providing additional income sources for the local community.</p>`,
      category: 'GOVERNMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1588184895644-2e57e4e1b50f?w=1200',
      featuredImageAlt: 'Terraced rice fields in Bali',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 5,
      containsAccusation: false,
      verificationLevel: 'MEDIUM' as const,
      evidenceCount: 1,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 432000000), // 5 days ago
    },

    // JOBS
    {
      title: 'Bali Tourism Sector Opens 5,000 Job Vacancies for Holiday Season',
      slug: 'bali-tourism-sector-opens-5000-job-vacancies-holiday-season',
      excerpt: 'Hotels, restaurants, and tourist attractions in Bali are opening thousands of job vacancies ahead of the year-end holiday season with various positions from servers to managers.',
      content: `<p>The Indonesian Hotel and Restaurant Association (PHRI) Bali announced the opening of more than 5,000 job vacancies ahead of the year-end holiday season.</p><p>Available positions include front office, housekeeping, F&B service, chef, spa therapist, and managerial roles. Most positions are intended for local Bali workers.</p><p>A job fair will be held at the Bali Tourism Board on December 15-17, 2024 with free registration through the official PHRI Bali website.</p>`,
      category: 'INVESTMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200',
      featuredImageAlt: 'People working at hotel',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 8,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 2,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 518400000), // 6 days ago
    },
    {
      title: 'Free Barista Training Program from Bali Manpower Department',
      slug: 'free-barista-training-program-bali-manpower-department',
      excerpt: 'Bali Manpower Department opens a free professional barista training program for 200 participants with national certification and job placement.',
      content: `<p>The Bali Provincial Manpower Department opened registration for a free professional barista training program for 200 participants.</p><p>This 3-month program includes theory and practice of coffee making, latte art, coffee roasting, and cafe management. Participants will receive certification from the National Professional Certification Agency (BNSP).</p><p>Top graduates will have opportunities for job placement at cafes and star-rated hotels in Bali. Registration is open until December 31, 2024.</p>`,
      category: 'INVESTMENT' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200',
      featuredImageAlt: 'Barista making coffee',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 5,
      containsAccusation: false,
      verificationLevel: 'HIGH' as const,
      evidenceCount: 1,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 604800000), // 7 days ago
    },

    // OPINION
    {
      title: 'Opinion: Bali Needs Balance Between Tourism and Cultural Preservation',
      slug: 'opinion-bali-needs-balance-tourism-cultural-preservation',
      excerpt: 'Rapid tourism growth in Bali must be balanced with local cultural preservation efforts to avoid losing its identity as the Island of the Gods.',
      content: `<p>By: I Made Sukerta, Balinese Cultural Expert</p><p>Bali has long been known as a world tourism destination. However, the rapid growth of the tourism sector raises concerns about the loss of local cultural values that are the island\'s main attraction.</p><p>Commercialization of traditional ceremonies, conversion of agricultural land to commercial areas, and erosion of the Balinese language among the younger generation are some challenges that must be addressed immediately.</p><p>The government and community need to work together to formulate policies that not only pursue economic growth, but also maintain the sustainability of Balinese culture for future generations.</p>`,
      category: 'OPINION' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
      featuredImageAlt: 'Balinese traditional ceremony',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'MEDIUM' as const,
      riskScore: 25,
      containsAccusation: false,
      verificationLevel: 'LOW' as const,
      evidenceCount: 0,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: admin.id,
      publishedAt: new Date(Date.now() - 691200000), // 8 days ago
    },
    {
      title: 'Opinion: Bali Traffic Solution Not Just Infrastructure, But Also Behavior Change',
      slug: 'opinion-bali-traffic-solution-not-just-infrastructure-behavior-change',
      excerpt: 'Traffic congestion in Bali cannot be solved only by building new roads, but also requires changes in driving culture and use of public transportation.',
      content: `<p>By: Wayan Suardika, Transportation Observer</p><p>Traffic congestion on various roads in Bali, especially in Denpasar and Badung areas, has reached a worrying point. Many parties demand the construction of new roads or widening of existing ones.</p><p>However, infrastructure solutions alone are not enough. Without changes in public driving behavior and willingness to switch to public transportation, new roads will soon be full again.</p><p>The government needs to consistently develop a comfortable and affordable public transportation system, while promoting a culture of orderly traffic and sharing the road with public vehicles.</p>`,
      category: 'OPINION' as const,
      featuredImageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200',
      featuredImageAlt: 'City traffic congestion',
      imageSource: 'Unsplash',
      aiAssisted: false,
      riskLevel: 'LOW' as const,
      riskScore: 15,
      containsAccusation: false,
      verificationLevel: 'LOW' as const,
      evidenceCount: 0,
      legalReviewRequired: false,
      status: 'PUBLISHED' as const,
      authorId: editor.id,
      publishedAt: new Date(Date.now() - 777600000), // 9 days ago
    },
  ]

  for (const articleData of articles) {
    const article = await db.article.create({
      data: articleData,
    })
    console.log('Created article:', article.title)

    // Add evidence for each article
    await db.evidence.create({
      data: {
        articleId: article.id,
        fileUrl: 'https://baliprov.go.id/documents/peraturan.pdf',
        type: 'document',
        source: 'Pemerintah Provinsi Bali',
        description: 'Dokumen peraturan resmi',
        verified: true,
      },
    })

    await db.evidence.create({
      data: {
        articleId: article.id,
        fileUrl: 'https://bps-bali.go.id/data/statistik.xlsx',
        type: 'document',
        source: 'BPS Provinsi Bali',
        description: 'Data statistik pendukung',
        verified: true,
      },
    })
  }

  console.log('\n✅ Seed completed!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin: baliminor2009@gmail.com / @Lcf210492')
  console.log('   Editor: editor@newsbali.online / editor123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
