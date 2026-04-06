import { Navbar } from '../components/landing/Navbar'
import { HeroSection } from '../components/landing/HeroSection'
import { TrustedBy } from '../components/landing/TrustedBy'
import { FeaturesGrid } from '../components/landing/FeaturesGrid'
import { ProductShowcase } from '../components/landing/ProductShowcase'
import { HowItWorks } from '../components/landing/HowItWorks'
import { StatsSection } from '../components/landing/StatsSection'
import { IntegrationsSection } from '../components/landing/IntegrationsSection'
import { Testimonials } from '../components/landing/Testimonials'
import { PricingSection } from '../components/landing/PricingSection'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { Footer } from '../components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <TrustedBy />
      <FeaturesGrid />
      <ProductShowcase />
      <HowItWorks />
      <StatsSection />
      <IntegrationsSection />
      <Testimonials />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
