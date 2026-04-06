import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for solo agents getting started.',
    cta: 'Start Free',
    highlighted: false,
    features: [
      'Up to 100 contacts',
      'Basic pipeline view',
      'Email campaigns (500/mo)',
      'Lead capture forms',
      'Mobile responsive',
    ],
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For agents ready to scale their business.',
    cta: 'Start Free Trial',
    highlighted: true,
    features: [
      'Unlimited contacts',
      'Advanced pipeline + automation',
      'Multi-channel campaigns',
      'AI lead scoring',
      'Analytics dashboard',
      'Team collaboration (up to 5)',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: '$149',
    period: '/month',
    description: 'For teams and brokerages at scale.',
    cta: 'Contact Sales',
    highlighted: false,
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'AI Intelligence Hub',
      'Custom workflows',
      'API access',
      'White-label options',
      'Dedicated account manager',
      'SSO & advanced security',
    ],
  },
]

export function PricingSection() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="pricing" className="py-24 bg-gray-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Simple pricing,{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              no surprises
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 items-start transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/10 scale-[1.02] md:scale-105'
                  : 'bg-white border border-gray-200 hover:shadow-lg'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                {plan.period && (
                  <span className="text-gray-400 font-medium">{plan.period}</span>
                )}
              </div>

              <Link
                to="/auth/register"
                className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-blue-600' : 'text-emerald-500'
                      }`}
                    />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
