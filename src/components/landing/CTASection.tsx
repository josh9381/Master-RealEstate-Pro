import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'

export function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Glow effects */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
          Ready to grow your
          <br />
          real estate business?
        </h2>
        <p className="text-lg sm:text-xl text-blue-100/80 max-w-2xl mx-auto mb-10">
          Join 2,000+ agents already using RealEstate Pro to close more deals,
          save hours every week, and scale with confidence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            to="/auth/register"
            className="group flex items-center gap-2 px-8 py-4 text-lg font-semibold text-blue-700 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-2xl shadow-black/10 hover:-translate-y-0.5"
          >
            Start Free Today
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* VOICEOVER 3 PLACEHOLDER: Wire up audio player for CTA voiceover */}
          <button className="group flex items-center gap-3 px-8 py-4 text-lg font-medium text-white/90 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
              <Play className="h-4 w-4 text-white ml-0.5" />
            </div>
            Listen to our story
          </button>
        </div>

        <p className="text-blue-200/60 text-sm">
          No credit card required &middot; Free forever plan &middot; Setup in 2 minutes
        </p>
      </div>
    </section>
  )
}
