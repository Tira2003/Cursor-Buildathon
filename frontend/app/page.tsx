import { Header } from '@/components/layout/header'
import { Hero } from '@/components/home/hero'
import { HowItWorks } from '@/components/home/how-it-works'
import { FeaturesSection } from '@/components/home/features-section'
import { FeaturedTimelines } from '@/components/home/featured-timelines'
import { BottomCTA } from '@/components/home/bottom-cta'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        <Hero />
        <HowItWorks />
        <FeaturesSection />
        <FeaturedTimelines />
        <BottomCTA />
      </main>
    </div>
  )
}
