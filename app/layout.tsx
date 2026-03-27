import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ad Creative Studio — SpredX',
  description: 'AI-powered ad creative generation for SpredX clients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
