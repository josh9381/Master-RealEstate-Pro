import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Top Producer, Keller Williams',
    quote:
      'RealEstate Pro completely transformed my business. I went from spending hours on follow-ups to having AI handle it all. My conversion rate tripled in 3 months.',
    rating: 5,
    initials: 'SM',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'David Chen',
    role: 'Team Lead, RE/MAX',
    quote:
      'The pipeline view alone is worth it. But add in the campaign automation and AI scoring? My team of 8 agents has never been more productive.',
    rating: 5,
    initials: 'DC',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Maria Rodriguez',
    role: 'Broker, Compass',
    quote:
      'I was skeptical of another CRM, but the AI intelligence hub is something else. It predicted which leads would convert — and it was right 85% of the time.',
    rating: 5,
    initials: 'MR',
    gradient: 'from-emerald-500 to-teal-500',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Loved by agents{' '}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              across the country
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            See why thousands of real estate professionals made the switch.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="relative p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-gray-600 leading-relaxed mb-8">
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
                  <p className="font-bold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
