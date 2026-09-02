import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { analyzeLegalRisk } from '@/lib/ai/legal-risk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, category, content, sourceContact, evidenceLinks } = body

    // Create report record
    const report = await db.report.create({
      data: {
        title,
        category: category || 'GOVERNMENT',
        content,
        sourceContact,
        evidenceLinks: evidenceLinks ? JSON.stringify(evidenceLinks) : null, // Store as JSON string
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Laporan berhasil dikirim'
    })
  } catch (error) {
    console.error('Report error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengirim laporan' },
      { status: 500 }
    )
  }
}
