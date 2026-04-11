import { Star } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Top Producer, Keller Williams',
    quote:
      'RealEstate Pro completely transformed my business. I went from spending hours on follow-ups to having AI handle it all. My conversion rate tripled in 3 months.',
    rating: 5,
    initials: 'SM',
    gradient: 'from-primary to-info',
  },
  {
    name: 'David Chen',
    role: 'Team Lead, RE/MAX',
    quote:
      'The pipeline view alone is worth it. But add in the campaign automation and AI scoring? My team of 8 agents has never been more productive.',
    rating: 5,
    initials: 'DC',
    gradient: 'from-primary/80 to-destructive/60',
  },
  {
    name: 'Maria Rodriguez',
    role: 'Broker, Compass',
    quote:
      'I was skeptical of another CRM, but the AI intelligence hub is something else. It predicted which leads would convert — and it was right 85% of the time.',
    rating: 5,
    initials: 'MR',
    gradient: 'from-success to-info/70',
  },
]

export function Testimonials() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section id="testimonials" className="py-24 bg-background" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Loved by agents{' '}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              across the country
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            See why thousands of real estate professionals made the switch.
          </p>
        </div>

        {/* Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative p-8 rounded-2xl border border-border bg-card hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-warning fill-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-muted-foreground leading-relaxed mb-8">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* AVATAR PLACEHOLDER: Replace with Nano Banana Pro generated portrait
                    <img src="/landing/testimonial-1.jpg" alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                */}
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
