import {
  Users,
  Megaphone,
  Brain,
  BarChart3,
  MessageSquare,
  Zap,
} from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const features = [
  {
    icon: Users,
    title: 'Lead Management',
    description:
      'Capture, organize, and nurture leads with a visual pipeline. Auto-assign, score, and segment contacts effortlessly.',
    color: 'blue',
  },
  {
    icon: Megaphone,
    title: 'Campaign Automation',
    description:
      'Launch multi-channel campaigns across email, SMS, and social. A/B test everything and optimize on autopilot.',
    color: 'purple',
  },
  {
    icon: Brain,
    title: 'AI Intelligence Hub',
    description:
      'Get AI-powered lead scoring, smart follow-up suggestions, content generation, and predictive analytics.',
    color: 'cyan',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description:
      'Track conversions, revenue, ROI by source, and pipeline velocity with real-time interactive charts.',
    color: 'emerald',
  },
  {
    icon: MessageSquare,
    title: 'Communication Hub',
    description:
      'Unified inbox for email, SMS, calls, and social. Templates, scheduling, and conversation history in one place.',
    color: 'orange',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description:
      'Build visual workflows with triggers and actions. Automate follow-ups, tasks, notifications, and handoffs.',
    color: 'rose',
  },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
  purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
  cyan: 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
  emerald: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
  orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white',
  rose: 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
}

export function FeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="features" className="py-24 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              dominate your market
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            One platform to manage your entire real estate business — from first contact to closing day.
          </p>
        </div>

        {/* Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-colors duration-300 ${
                  colorMap[feature.color]
                }`}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
