import { Play, CheckCircle2 } from 'lucide-react'

const bulletPoints = [
  'Visual pipeline with drag-and-drop deal management',
  'AI-powered lead scoring and smart follow-ups',
  'Multi-channel campaigns on autopilot',
  'Real-time analytics and conversion tracking',
]

export function ProductShowcase() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Product Image */}
          <div className="relative">
            {/* IMAGE 2 PLACEHOLDER: Replace with Nano Banana Pro product showcase image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-300/50 border border-gray-200">
              <div className="aspect-[16/10] bg-gradient-to-br from-gray-100 via-blue-50 to-indigo-100 flex items-center justify-center">
                {/* Fake dashboard skeleton */}
                <div className="w-[90%] h-[85%] bg-white rounded-xl shadow-inner p-4 flex flex-col gap-3">
                  {/* Top bar */}
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-300" />
                    <div className="w-3 h-3 rounded-full bg-yellow-300" />
                    <div className="w-3 h-3 rounded-full bg-green-300" />
                    <div className="flex-1 h-5 bg-gray-100 rounded ml-4" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    {/* Sidebar */}
                    <div className="col-span-1 bg-gray-50 rounded-lg p-2 space-y-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={`h-4 rounded ${i === 1 ? 'bg-blue-200' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    {/* Main area */}
                    <div className="col-span-3 space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {['blue', 'emerald', 'purple', 'orange'].map((c) => (
                          <div key={c} className={`h-16 rounded-lg bg-${c === 'blue' ? 'blue' : c === 'emerald' ? 'emerald' : c === 'purple' ? 'purple' : 'orange'}-100`} />
                        ))}
                      </div>
                      <div className="h-32 bg-gradient-to-r from-blue-100 to-cyan-50 rounded-lg" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 bg-gray-100 rounded-lg" />
                        <div className="h-20 bg-gray-100 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Nano Banana replacement comment */}
              {/* Replace the above skeleton with:
                  <img src="/landing/product-showcase.png" alt="RealEstate Pro Dashboard" className="w-full h-full object-cover" />
              */}
            </div>

            {/* Floating accent */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl" />
          </div>

          {/* Right: Copy */}
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
              See It In Action
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
              Your entire business,
              <br />
              <span className="text-blue-600">one powerful dashboard</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              From lead capture to closing day — manage your pipeline, launch smart campaigns,
              and let AI do the heavy lifting. All in one platform.
            </p>

            {/* Bullet list */}
            <ul className="space-y-4 mb-10">
              {bulletPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{point}</span>
                </li>
              ))}
            </ul>

            {/* VOICEOVER 2 PLACEHOLDER: Wire up audio player */}
            <button className="group inline-flex items-center gap-3 px-6 py-3 text-blue-600 font-semibold bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 group-hover:bg-blue-700 transition-colors">
                <Play className="h-4 w-4 text-white ml-0.5" />
              </div>
              Hear about our features
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
