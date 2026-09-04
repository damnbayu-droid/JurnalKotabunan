'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Search, User, X, Settings, Sun, Moon, Monitor, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'

const categories = {
  en: [
    { href: '/category/government', label: 'Government' },
    { href: '/category/tourism', label: 'Tourism' },
    { href: '/category/investment', label: 'Investment' },
    { href: '/category/incidents', label: 'Incidents' },
    { href: '/category/environment', label: 'Environment' },
    { href: '/category/panang', label: 'Panang' },
    { href: '/category/international', label: 'International' },
    { href: '/category/technology', label: 'Technology' },
    { href: '/category/opinion', label: 'Opinion' },
  ],
  id: [
    { href: '/category/government', label: 'Pemerintahan' },
    { href: '/category/tourism', label: 'Pariwisata' },
    { href: '/category/investment', label: 'Investasi' },
    { href: '/category/incidents', label: 'Insiden' },
    { href: '/category/environment', label: 'Lingkungan Hidup' },
    { href: '/category/panang', label: 'Panang' },
    { href: '/category/international', label: 'Internasional' },
    { href: '/category/technology', label: 'Teknologi' },
    { href: '/category/opinion', label: 'Opini' },
  ],
}

const translations = {
  en: {
    search: 'Search articles...',
    submitReport: 'Submit Report',
    transparency: 'Transparency',
    about: 'About',
    login: 'Login',
    register: 'Register',
    categories: 'Categories',
    tagline: 'Investigative Journalism',
  },
  id: {
    search: 'Cari artikel...',
    submitReport: 'Kirim Laporan',
    transparency: 'Transparansi',
    about: 'Tentang',
    login: 'Masuk',
    register: 'Daftar',
    categories: 'Kategori',
    tagline: 'Jurnalisme Investigasi',
  },
}

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  // Site is Indonesian-only - no language switch.
  const lang = 'id' as const
  const [hydrated, setHydrated] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setHydrated(true)
  }, [])

  const t = translations[lang]
  const cats = categories[lang]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
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

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-1">
          {cats.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {category.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {searchOpen ? (
            // Plain GET form to /search - no JS wiring needed to actually
            // search (was previously just a decorative Input with no
            // onChange/onSubmit at all).
            <form action="/search" method="get" className="flex items-center space-x-2">
              <Input
                type="search"
                name="q"
                placeholder={t.search}
                className="w-48 md:w-64"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <>
              {/* Language & Theme */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* Radix generates this trigger's `id` via useId(), which can render a
                      different value on the server vs. the client hydration pass in this
                      tree shape - a known, cosmetic-only Radix/Next.js SSR quirk (the id
                      settles correctly post-hydration; nothing about aria wiring or click
                      behavior is affected). suppressHydrationWarning targets just that one
                      attribute instead of silencing hydration mismatches app-wide. */}
                  <Button variant="ghost" size="icon" suppressHydrationWarning aria-label="Tema">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Tema</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="mr-2 h-4 w-4" /> Terang
                    {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="mr-2 h-4 w-4" /> Gelap
                    {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="mr-2 h-4 w-4" /> Sistem
                    {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex"
              >
                <Search className="h-4 w-4" />
              </Button>

              <Link href="/login">
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </Link>

              {/* Mobile Menu */}
              {hydrated && (
                <Sheet key={`sheet-${lang}`}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetTitle className="sr-only">{t.categories}</SheetTitle>
                    <nav className="flex flex-col space-y-4 mt-8">
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {t.categories}
                        </span>
                      </div>
                      {cats.map((category) => (
                        <Link
                          key={category.href}
                          href={category.href}
                          className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors text-right"
                        >
                          {category.label}
                        </Link>
                      ))}
                      <hr className="my-2" />
                      <Link
                        href="/submit-report"
                        className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors text-right"
                      >
                        {t.submitReport}
                      </Link>
                      <Link
                        href="/transparency"
                        className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors text-right"
                      >
                        {t.transparency}
                      </Link>
                      <Link
                        href="/about"
                        className="px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors text-right"
                      >
                        {t.about}
                      </Link>
                      <hr className="my-2" />
                      <Link href="/login">
                        <Button className="w-full">{t.login}</Button>
                      </Link>
                      <Link href="/register">
                        <Button variant="outline" className="w-full">
                          {t.register}
                        </Button>
                      </Link>
                    </nav>
                  </SheetContent>
                </Sheet>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
