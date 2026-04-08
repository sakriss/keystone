import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Keystone — Your Home Buying & Renovation Hub',
  description: 'Track your home buying journey and renovation projects in one place.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
