import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, TrendingUp, Users, BarChart3, Zap, Shield } from 'lucide-react'

const features = [
  { icon: TrendingUp, text: 'AI-powered lead scoring' },
  { icon: Users, text: 'Smart CRM automation' },
  { icon: BarChart3, text: 'Real-time analytics' },
  { icon: Zap, text: 'Workflow automation' },
  { icon: Shield, text: 'Enterprise-grade security' },
]

export function AuthLayout() {
  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(224 71% 4%) 0%, hsl(231 50% 10%) 50%, hsl(224 71% 4%) 100%)',
        }}
      >
        {/* Ambient orbs */}
        <div
          className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            transform: 'translate(-30%, -30%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(280 65% 60% / 0.1) 0%, transparent 70%)',
            transform: 'translate(30%, 30%)',
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3"
        >
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
              boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)',
            }}
          >
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">RealEstate Pro</p>
            <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 55%)' }}>CRM Platform</p>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <h2
            className="text-4xl xl:text-5xl font-bold leading-tight mb-4"
            style={{ color: 'white' }}
          >
            Close more deals with{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #8B5CF6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              AI-powered
            </span>{' '}
            CRM
          </h2>
          <p className="text-lg mb-10" style={{ color: 'hsl(215 20% 65%)' }}>
            The complete real estate CRM platform with intelligent lead management, automated campaigns, and predictive analytics.
          </p>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.08 }}
                className="flex items-center gap-3"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                  style={{
                    background: 'hsl(var(--primary) / 0.15)',
                    border: '1px solid hsl(var(--primary) / 0.25)',
                  }}
                >
                  <feature.icon className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'hsl(215 20% 75%)' }}>
                  {feature.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative grid grid-cols-3 gap-6"
        >
          {[
            { value: '10K+', label: 'Active Users' },
            { value: '2.5M', label: 'Leads Managed' },
            { value: '98%', label: 'Uptime SLA' },
          ].map((stat) => (
            <div key={stat.label}>
              <p
                className="text-2xl font-bold"
                style={{ color: 'white' }}
              >
                {stat.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 55%)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right Panel - Auth Form */}
      <div
        className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12"
        style={{ background: 'hsl(var(--background))' }}
      >
        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:hidden flex items-center gap-3 mb-8"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
              boxShadow: '0 4px 14px hsl(var(--primary) / 0.35)',
            }}
          >
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-base leading-none">RealEstate Pro</p>
            <p className="text-xs text-muted-foreground mt-0.5">CRM Platform</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
