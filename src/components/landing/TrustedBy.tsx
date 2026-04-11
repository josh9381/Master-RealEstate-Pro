const companies = [
  { name: 'Keller Williams', abbr: 'KW' },
  { name: 'RE/MAX', abbr: 'RM' },
  { name: 'Coldwell Banker', abbr: 'CB' },
  { name: 'Century 21', abbr: 'C21' },
  { name: 'Compass', abbr: 'CO' },
  { name: 'eXp Realty', abbr: 'eXp' },
  { name: 'Sotheby\'s', abbr: 'SI' },
  { name: 'Berkshire Hathaway', abbr: 'BH' },
]

export function TrustedBy() {
  return (
    <section className="py-14 bg-muted border-y border-border overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-10">
          Trusted by 2,000+ agents at top brokerages
        </p>
      </div>

      {/* Infinite marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-muted to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-muted to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee">
          {[...companies, ...companies].map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              className="flex-shrink-0 mx-8 sm:mx-12 flex items-center gap-3 group"
            >
              <div className="w-11 h-11 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors duration-300">
                <span className="text-xs font-extrabold text-muted-foreground group-hover:text-primary transition-colors duration-300">
                  {c.abbr}
                </span>
              </div>
              <span className="text-lg font-bold text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-300 whitespace-nowrap select-none">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
