import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getUserItem, setUserItem } from '@/lib/userStorage'
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  Zap,
  Brain,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TOUR_STORAGE_KEY = 'onboarding_tour_completed'
const TOUR_STEP_KEY = 'onboarding_tour_step'

export interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  target?: string // CSS selector to highlight
  navigateTo?: string // route to navigate to for this step
  position?: 'center' | 'bottom-right' | 'top-right'
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RealEstate Pro!',
    description:
      "Let's take a quick tour of the platform. We'll walk you through every major section so you can hit the ground running. You can skip this tour at any time.",
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: 'Dashboard — Your Command Center',
    description:
      'This is your dashboard. See key metrics at a glance: total leads, active campaigns, conversion rates, and upcoming tasks. Use the date filter to adjust your view and the quick actions to jump to common tasks.',
    icon: LayoutDashboard,
    navigateTo: '/',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'leads',
    title: 'Leads — Manage Your Contacts',
    description:
      'The Leads section is where you manage all your contacts and prospects. Add leads manually, import from CSV, organize them with tags, track through your pipeline, and view detailed profiles with full activity history.',
    icon: Users,
    navigateTo: '/leads',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'campaigns',
    title: 'Campaigns — Reach Your Audience',
    description:
      'Create and manage email and SMS campaigns. Use templates to get started quickly, schedule campaigns for optimal delivery, run A/B tests to optimize performance, and track results with detailed reports.',
    icon: Megaphone,
    navigateTo: '/campaigns',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'communication',
    title: 'Communication — Unified Inbox',
    description:
      'Your unified communication hub. View all emails and messages in one inbox, manage email templates, handle calls from the Cold Call Hub, and compose AI-enhanced messages to save time.',
    icon: MessageSquare,
    navigateTo: '/communication/inbox',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'workflows',
    title: 'Automation — Work Smarter',
    description:
      'Automate repetitive tasks with workflows. Build visual workflows with triggers and actions, set up automation rules, and let the system handle follow-ups, lead assignments, and notifications automatically.',
    icon: Zap,
    navigateTo: '/workflows',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'ai',
    title: 'AI Hub — Your AI Assistant',
    description:
      'Leverage AI throughout the platform. Get intelligent lead scoring, predictive analytics, AI-powered content generation, smart segmentation, and actionable insights — all designed to help you close more deals.',
    icon: Brain,
    navigateTo: '/ai',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'analytics',
    title: 'Analytics — Data-Driven Decisions',
    description:
      'Dive deep into your data. Track lead conversions, campaign performance, attribution models, goal progress, and custom reports. Export reports as PDF or CSV and schedule automated report delivery.',
    icon: BarChart3,
    navigateTo: '/analytics',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'settings',
    title: 'Settings — Customize Everything',
    description:
      'Configure your account, business profile, notifications, security, integrations, team management, custom fields, and compliance settings. Everything you need to tailor the platform to your business.',
    icon: Settings,
    navigateTo: '/settings',
    target: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description:
      "That's the full tour! You can always restart this tour from Settings. Start by adding your first lead or exploring the AI Hub. If you need help, check the Help Center in the sidebar.",
    icon: Sparkles,
    position: 'center',
  },
]

interface OnboardingTourProps {
  /** Force-show the tour (e.g. from settings "Show Tour" button) */
  forceShow?: boolean
  onComplete?: () => void
}

export function OnboardingTour({ forceShow, onComplete }: OnboardingTourProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const userId = useAuthStore((s) => s.user?.id)
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Determine if tour should show
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true)
      setCurrentStep(0)
      return
    }
    const completed = getUserItem(userId, TOUR_STORAGE_KEY)
    if (completed === 'true') {
      setIsVisible(false)
      return
    }
    // Show tour for new users (no completed flag)
    const savedStep = getUserItem(userId, TOUR_STEP_KEY)
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10))
    }
    setIsVisible(true)
  }, [userId, forceShow])

  // Update highlight rect when step changes
  useEffect(() => {
    if (!isVisible) return
    const step = TOUR_STEPS[currentStep]
    if (step.target) {
      // Small delay to let navigation complete
      const timer = setTimeout(() => {
        const el = document.querySelector(step.target!)
        if (el) {
          setHighlightRect(el.getBoundingClientRect())
        } else {
          setHighlightRect(null)
        }
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setHighlightRect(null)
    }
  }, [currentStep, isVisible, location.pathname])

  const completeTour = useCallback(() => {
    setUserItem(userId, TOUR_STORAGE_KEY, 'true')
    setUserItem(userId, TOUR_STEP_KEY, '0')
    setIsVisible(false)
    onComplete?.()
  }, [userId, onComplete])

  const handleNext = useCallback(() => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      completeTour()
      navigate('/')
      return
    }
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    setUserItem(userId, TOUR_STEP_KEY, String(nextStep))
    const step = TOUR_STEPS[nextStep]
    if (step.navigateTo) {
      navigate(step.navigateTo)
    }
  }, [currentStep, userId, navigate, completeTour])

  const handlePrev = useCallback(() => {
    if (currentStep <= 0) return
    const prevStep = currentStep - 1
    setCurrentStep(prevStep)
    setUserItem(userId, TOUR_STEP_KEY, String(prevStep))
    const step = TOUR_STEPS[prevStep]
    if (step.navigateTo) {
      navigate(step.navigateTo)
    }
  }, [currentStep, userId, navigate])

  const handleSkip = useCallback(() => {
    completeTour()
    navigate('/')
  }, [completeTour, navigate])

  if (!isVisible) return null

  const step = TOUR_STEPS[currentStep]
  const StepIcon = step.icon
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TOUR_STEPS.length - 1
  const isCentered = step.position === 'center' || !step.target

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[200]" aria-modal="true" role="dialog" aria-label="Onboarding tour">
      {/* Overlay backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Highlight cutout — subtle glow around the target area */}
      {highlightRect && !isCentered && (
        <div
          className="absolute border-2 border-primary/60 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] pointer-events-none transition-all duration-300"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: Math.min(highlightRect.height + 16, window.innerHeight * 0.6),
          }}
        />
      )}

      {/* Tour card */}
      <div
        className={`absolute bg-card border rounded-xl shadow-2xl p-6 w-[420px] max-w-[calc(100vw-2rem)] transition-all duration-300 ${
          isCentered
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'bottom-6 right-6'
        }`}
      >
        {/* Close / Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step icon + title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
            <StepIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">{step.title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="outline" size="sm" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          {isFirstStep && (
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              Skip Tour
            </Button>
          )}
          <div className="flex-1" />
          <Button size="sm" onClick={handleNext}>
            {isLastStep ? 'Get Started' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour
