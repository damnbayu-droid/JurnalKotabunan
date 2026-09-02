'use client'

import Link from 'next/link'
import { Facebook, Instagram, Twitter, Youtube, Mail } from 'lucide-react'
import { useState } from 'react'

const footerLinks = {
  en: {
    categories: [
      { href: '/category/tourism', label: 'Tourism' },
      { href: '/category/government', label: 'Government' },
      { href: '/category/investment', label: 'Investment' },
      { href: '/category/incidents', label: 'Incidents' },
      { href: '/category/local', label: 'Local' },
      { href: '/category/jobs', label: 'Jobs' },
      { href: '/category/opinion', label: 'Opinion' },
    ],
    company: [
      { href: '/about', label: 'About Us' },
      { href: '/editorial-team', label: 'Editorial Team' },
      { href: '/transparency', label: 'Transparency' },
      { href: '/submit-report', label: 'Submit Report' },
      { href: '/contact', label: 'Contact' },
      { href: '/ads', label: 'Advertise With Us' },
    ],
    legal: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms-conditions', label: 'Terms & Conditions' },
      { href: '/editorial-guidelines', label: 'Editorial Guidelines' },
      { href: '/journalistic-code', label: 'Journalistic Code of Ethics' },
      { href: '/cyber-media-guidelines', label: 'Cyber Media Guidelines' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
  id: {
    categories: [
      { href: '/category/tourism', label: 'Pariwisata' },
      { href: '/category/government', label: 'Pemerintah' },
      { href: '/category/investment', label: 'Investasi' },
      { href: '/category/incidents', label: 'Insiden' },
      { href: '/category/local', label: 'Lokal' },
      { href: '/category/jobs', label: 'Pekerjaan' },
      { href: '/category/opinion', label: 'Opini' },
    ],
    company: [
      { href: '/about', label: 'Tentang Kami' },
      { href: '/editorial-team', label: 'Redaksi' },
      { href: '/transparency', label: 'Transparansi' },
      { href: '/submit-report', label: 'Kirim Laporan' },
      { href: '/contact', label: 'Kontak' },
      { href: '/ads', label: 'Pasang Iklan' },
    ],
    legal: [
      { href: '/privacy-policy', label: 'Kebijakan Privasi' },
      { href: '/terms-conditions', label: 'Syarat & Ketentuan' },
      { href: '/editorial-guidelines', label: 'Pedoman Editorial' },
      { href: '/journalistic-code', label: 'Kode Etik Jurnalistik' },
      { href: '/cyber-media-guidelines', label: 'Pedoman Media Siber' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
}

const translations = {
  en: {
    description: 'Independent investigative journalism platform for Kotabunan. Delivering evidence-based news with high journalistic ethics standards.',
    categories: 'Categories',
    company: 'Company',
    newsletter: 'Newsletter',
    newsletterDesc: 'Get the latest news delivered to your inbox.',
    emailPlaceholder: 'Your Email',
    copyright: 'All rights reserved.',
    tagline: 'Investigative Journalism',
    subscribing: 'Subscribing...',
    subscribeSuccess: 'Subscribed! Check your inbox.',
    subscribeAlready: 'You are already subscribed.',
    subscribeError: 'Failed to subscribe. Try again.',
    emailUs: 'Or email us directly:',
  },
  id: {
    description: 'Platform jurnalisme investigasi independen untuk Kotabunan. Menyajikan berita berbasis bukti dengan standar etika jurnalisme tinggi.',
    categories: 'Kategori',
    company: 'Perusahaan',
    newsletter: 'Newsletter',
    newsletterDesc: 'Dapatkan berita terbaru langsung ke email Anda.',
    emailPlaceholder: 'Email Anda',
    copyright: 'Hak cipta dilindungi.',
    tagline: 'Jurnalisme Investigasi',
    subscribing: 'Mendaftarkan...',
    subscribeSuccess: 'Berhasil berlangganan! Cek inbox kamu.',
    subscribeAlready: 'Kamu sudah berlangganan.',
    subscribeError: 'Gagal berlangganan. Coba lagi.',
    emailUs: 'Atau email kami langsung:',
  },
}

const socialLinks = [
  { href: 'https://facebook.com/jurnalkotabunan', icon: Facebook, label: 'Facebook' },
  { href: 'https://instagram.com/jurnalkotabunan', icon: Instagram, label: 'Instagram' },
  { href: 'https://twitter.com/jurnalkotabunan', icon: Twitter, label: 'Twitter' },
  { href: 'https://youtube.com/@jurnalkotabunan', icon: Youtube, label: 'YouTube' },
]

export function Footer() {
  // Site is Indonesian-only - no language switch.
  const lang = 'id' as const
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeState, setSubscribeState] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!subscribeEmail.trim() || subscribeState === 'loading') return
    setSubscribeState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSubscribeState(data.alreadySubscribed ? 'already' : 'success')
      setSubscribeEmail('')
    } catch {
      setSubscribeState('error')
    }
  }

  const t = translations[lang]
  const links = footerLinks[lang]

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Jurnal <span className="text-primary">Kotabunan</span>
                </span>
                <span className="text-[10px] text-muted-foreground -mt-1">
                  {t.tagline}
                </span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t.description}
            </p>
            <div className="flex space-x-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">{t.categories}</h3>
            <ul className="space-y-2">
              {links.categories.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">{t.company}</h3>
            <ul className="space-y-2">
              {links.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">{t.newsletter}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t.newsletterDesc}
            </p>
            <form className="flex space-x-2" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                disabled={subscribeState === 'loading'}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={subscribeState === 'loading'}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
              </button>
            </form>
            {subscribeState === 'success' && (
              <p className="text-xs text-green-600 mt-2">{t.subscribeSuccess}</p>
            )}
            {subscribeState === 'already' && (
              <p className="text-xs text-muted-foreground mt-2">{t.subscribeAlready}</p>
            )}
            {subscribeState === 'error' && (
              <p className="text-xs text-destructive mt-2">{t.subscribeError}</p>
            )}

            {/* Direct contact email - shown right below the newsletter
                field per explicit request, so visitors can reach out
                without needing the /contact form. */}
            <p className="text-xs text-muted-foreground mt-3">
              {t.emailUs}{' '}
              <a href="mailto:info@jurnal.kotabunan.com" className="underline hover:text-foreground">
                info@jurnal.kotabunan.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Jurnal Kotabunan. {t.copyright}
          </p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {links.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
