import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const integrations = [
  { name: 'Gmail', icon: 'M', colors: 'from-destructive to-destructive/80' },
  { name: 'Google Calendar', icon: 'GC', colors: 'from-primary to-primary/80' },
  { name: 'Google Contacts', icon: 'GCo', colors: 'from-info to-info/70' },
  { name: 'SendGrid', icon: 'SG', colors: 'from-primary/80 to-info' },
  { name: 'Twilio', icon: 'Tw', colors: 'from-destructive to-destructive/70' },
  { name: 'Zapier', icon: 'Z', colors: 'from-warning to-warning/80' },
  { name: 'Slack', icon: 'Sl', colors: 'from-primary to-info/80' },
  { name: 'Zillow', icon: 'Zi', colors: 'from-primary/80 to-primary/60' },
]

export function IntegrationsSection() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="py-20 bg-background" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Integrations
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Connects with the tools{' '}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              you already use
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Seamlessly sync your email, calendar, contacts, and messaging platforms.
          </p>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {integrations.map((integration, i) => (
            <div
              key={integration.name}
              className="group relative flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${integration.colors} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-white font-bold text-sm">{integration.icon}</span>
              </div>
              <span className="text-sm font-semibold text-foreground/80 text-center">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
