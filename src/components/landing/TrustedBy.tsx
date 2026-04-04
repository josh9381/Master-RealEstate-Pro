export function TrustedBy() {
  const companies = [
    'Keller Williams',
    'RE/MAX',
    'Coldwell Banker',
    'Century 21',
    'Compass',
    'eXp Realty',
  ]

  return (
    <section className="py-12 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">
          Trusted by agents at top brokerages
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {companies.map((name) => (
            <div
              key={name}
              className="text-xl font-bold text-gray-300 hover:text-gray-400 transition-colors cursor-default select-none"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
