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
  blue: 'bg-primary/10 text-primary group-hover:bg-primary transition-colors group-hover:text-white',
  purple: 'bg-primary/20 text-primary group-hover:bg-primary transition-colors group-hover:text-white',
  cyan: 'bg-info/10 text-info group-hover:bg-info transition-colors group-hover:text-white',
  emerald: 'bg-success/10 text-success group-hover:bg-success transition-colors group-hover:text-white',
  orange: 'bg-warning/10 text-warning group-hover:bg-warning transition-colors group-hover:text-white',
  rose: 'bg-destructive/10 text-destructive group-hover:bg-destructive transition-colors group-hover:text-white',
}

export function FeaturesGrid() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="features" className="py-24 bg-background" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              dominate your market
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            One platform to manage your entire real estate business — from first contact to closing day.
          </p>
        </div>

        {/* Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 transition-colors duration-300 ${
                  colorMap[feature.color]
                }`}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
