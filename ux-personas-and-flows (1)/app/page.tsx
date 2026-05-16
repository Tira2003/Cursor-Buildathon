import { Header } from '@/components/layout/header'
import { Hero } from '@/components/home/hero'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col">
        <Hero />
      </main>
    </div>
  )
}
