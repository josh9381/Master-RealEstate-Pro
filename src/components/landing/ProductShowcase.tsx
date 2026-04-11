import { CheckCircle2 } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

const bulletPoints = [
  'Visual pipeline with drag-and-drop deal management',
  'AI-powered lead scoring and smart follow-ups',
  'Multi-channel campaigns on autopilot',
  'Real-time analytics and conversion tracking',
]

function DashboardMockup() {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 border border-border bg-card">
      <div className="aspect-[16/10] flex flex-col">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 h-6 bg-background rounded-md border border-border ml-3 flex items-center px-3">
            <span className="text-[10px] text-muted-foreground">app.realestatepro.com/dashboard</span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-[18%] bg-gray-900 p-3 space-y-2 hidden sm:block">
            <div className="h-6 bg-primary rounded-md mb-4" />
            {['bg-gray-700', 'bg-blue-500/40 ring-1 ring-blue-500/50', 'bg-gray-700', 'bg-gray-700', 'bg-gray-700', 'bg-gray-800'].map((c, i) => (
              <div key={i} className={`h-4 rounded-md ${c}`} />
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-3 sm:p-4 space-y-3 bg-muted/50">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Active Leads', value: '2,847', color: 'border-l-blue-500 bg-card', change: '+12%' },
                { label: 'Deals Won', value: '$1.2M', color: 'border-l-emerald-500 bg-card', change: '+24%' },
                { label: 'Response Rate', value: '94%', color: 'border-l-purple-500 bg-card', change: '+8%' },
                { label: 'Campaigns', value: '18', color: 'border-l-orange-500 bg-card', change: '+3' },
              ].map((card, i) => (
                <div key={i} className={`rounded-lg p-2 border-l-[3px] ${card.color} shadow-sm`}>
                  <p className="text-[7px] sm:text-[9px] text-muted-foreground truncate">{card.label}</p>
                  <p className="text-[11px] sm:text-sm font-bold text-foreground">{card.value}</p>
                  <span className="text-[7px] sm:text-[8px] text-emerald-500 font-semibold">{card.change}</span>
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="bg-card rounded-lg p-3 shadow-sm border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] sm:text-[10px] font-semibold text-foreground/80">Pipeline Overview</span>
                <div className="flex gap-2">
                  {['1W', '1M', '3M'].map(p => (
                    <span key={p} className={`text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded ${p === '1M' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{p}</span>
                  ))}
                </div>
              </div>
              {/* Fake chart bars */}
              <div className="flex items-end gap-[3px] sm:gap-1 h-16 sm:h-20">
                {[40, 55, 45, 70, 60, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/80 opacity-80"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card rounded-lg p-2 shadow-sm border border-border">
                <span className="text-[8px] sm:text-[9px] font-semibold text-foreground/80">Recent Leads</span>
                <div className="space-y-1.5 mt-2">
                  {['John P.', 'Sarah M.', 'Alex K.'].map((name, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">{name[0]}</span>
                      </div>
                      <span className="text-[7px] sm:text-[8px] text-muted-foreground">{name}</span>
                      <span className="ml-auto text-[6px] sm:text-[7px] text-emerald-500 font-medium">Hot</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg p-2 shadow-sm border border-border">
                <span className="text-[8px] sm:text-[9px] font-semibold text-foreground/80">AI Insights</span>
                <div className="space-y-1.5 mt-2">
                  {['3 leads ready to convert', 'Campaign A/B winner found', 'Follow up Sarah today'].map((text, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${i === 0 ? 'bg-emerald-400' : i === 1 ? 'bg-blue-400' : 'bg-amber-400'}`} />
                      <span className="text-[7px] sm:text-[8px] text-muted-foreground leading-tight">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductShowcase() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="py-24 bg-muted" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Product Image */}
          <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <DashboardMockup />

            {/* Floating accent */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
          </div>

          {/* Right: Copy */}
          <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              See It In Action
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-6">
              Your entire business,
              <br />
              <span className="text-primary">one powerful dashboard</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-prose">
              From lead capture to closing day — manage your pipeline, launch smart campaigns,
              and let AI do the heavy lifting. All in one platform.
            </p>

            {/* Bullet list */}
            <ul className="space-y-4 mb-10">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/80 font-medium">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
