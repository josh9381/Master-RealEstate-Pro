import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const faqs = [
  {
    q: 'How long does it take to get started?',
    a: 'Most agents are fully set up within 10 minutes. Import your contacts via CSV or connect your existing tools, and our setup wizard guides you through the rest — email, SMS, and integrations included.',
  },
  {
    q: 'Do I need technical skills to use RealEstate Pro?',
    a: 'Not at all. RealEstate Pro is designed for real estate professionals, not developers. Everything from campaign creation to workflow automation uses a visual, drag-and-drop interface.',
  },
  {
    q: 'What makes the AI features different from other CRMs?',
    a: 'Our AI Intelligence Hub doesn\'t just score leads — it learns from your pipeline to predict which leads are most likely to convert, suggests optimal follow-up timing, generates personalized messages, and auto-optimizes your campaigns.',
  },
  {
    q: 'Can I use RealEstate Pro with my existing tools?',
    a: 'Yes. We integrate with Gmail, Google Calendar, Google Contacts, SendGrid for email delivery, and Twilio for SMS & voice. Our API also allows custom integrations with your favorite tools.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Absolutely. Our Starter plan is free forever and includes up to 100 contacts, basic pipeline views, email campaigns (500/month), and lead capture forms. Upgrade anytime when you\'re ready.',
  },
  {
    q: 'How does the multi-channel campaign system work?',
    a: 'Create campaigns that reach leads across email, SMS, and more — all from one screen. Set up automated sequences, A/B test messaging, and let AI optimize send times for maximum engagement.',
  },
  {
    q: 'Is my data secure?',
    a: 'Security is a top priority. We use industry-standard encryption, JWT-based authentication, role-based access control, and optional two-factor authentication. Enterprise plans include SSO and advanced security features.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no long-term contracts. You can upgrade, downgrade, or cancel your plan at any time. Your data remains accessible for 30 days after cancellation.',
  },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`border border-border rounded-xl overflow-hidden transition-all duration-300 ${
        open ? 'bg-card shadow-lg shadow-gray-100/50' : 'bg-card hover:shadow-md'
      }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-muted-foreground leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="faq" className="py-24 bg-background" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Got questions?{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              We&apos;ve got answers
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about RealEstate Pro.
          </p>
        </div>

        {/* FAQ items */}
        <div className={`space-y-3 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {faqs.map((faq, i) => (
            <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
