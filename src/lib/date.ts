// Bali Journal covers Bali, which runs on WITA (UTC+8, no DST). Every date
// shown to readers - published date, breaking news timestamps, etc. -
// should reflect the Bali calendar day the article actually went out on,
// not whatever timezone the process happens to be running in.
//
// Vercel's serverless functions default to UTC (no TZ env var set in this
// project), so any Date formatting done without an explicit timeZone
// silently renders in UTC - an article published between 00:00 and 07:59
// WITA then shows up dated ONE DAY EARLIER than its real Bali publish date.
// Confirmed as a real production bug (2026-09-02): articles created on
// Sept 2 WITA were rendering "September 1" on the live homepage/article
// cards, because those Server Components formatted the date with no
// timeZone option and Vercel's Lambda runtime clock is UTC. Client
// Components have the same problem for a visitor outside WITA - their
// browser's local timezone isn't the right one for an editorial "this was
// published on X" date either.
//
// Always pass BALI_TZ explicitly to toLocaleDateString/toLocaleString/
// Intl.DateTimeFormat calls that show a reader-facing publish date.
export const BALI_TZ = 'Asia/Makassar' // WITA, UTC+8, no DST
