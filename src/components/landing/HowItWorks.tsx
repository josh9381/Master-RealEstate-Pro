import { Upload, Rocket, TrendingUp } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Import Your Leads',
    description:
      'Upload your contacts via CSV or connect your existing tools. Our system auto-enriches profiles and deduplicates entries.',
    color: 'blue',
  },
  {
    icon: Rocket,
    number: '02',
    title: 'Launch Campaigns',
    description:
      'Pick from proven templates or build custom multi-channel campaigns. AI optimizes send times and messaging.',
    color: 'purple',
  },
  {
    icon: TrendingUp,
    number: '03',
    title: 'Close More Deals',
    description:
      'Track every interaction, get AI follow-up reminders, and watch your conversion rates climb with real-time analytics.',
    color: 'emerald',
  },
]

export function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="how-it-works" className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Up and running in{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              three simple steps
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            No complicated setup. No lengthy onboarding. Start closing deals in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className={`relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-emerald-200" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              {/* Step number */}
              <div className="relative inline-flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                    step.color === 'blue'
                      ? 'bg-blue-600 shadow-blue-600/25'
                      : step.color === 'purple'
                      ? 'bg-purple-600 shadow-purple-600/25'
                      : 'bg-emerald-600 shadow-emerald-600/25'
                  }`}
                >
                  <step.icon className="h-9 w-9 text-white" />
                </div>
                <span
                  className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    step.color === 'blue'
                      ? 'bg-blue-500'
                      : step.color === 'purple'
                      ? 'bg-purple-500'
                      : 'bg-emerald-500'
                  }`}
                >
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
