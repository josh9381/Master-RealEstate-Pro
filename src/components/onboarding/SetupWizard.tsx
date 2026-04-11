import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { getUserItem, setUserItem } from '@/lib/userStorage'
import { useToast } from '@/hooks/useToast'
import { useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Shield,
  Check,
  AlertTriangle,
  SkipForward,
  Sparkles,
  Send,
  Clock,
} from 'lucide-react'

const SETUP_WIZARD_KEY = 'setup_wizard_completed'

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  critical?: boolean
  criticalWarning?: string
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RealEstate Pro!',
    description: "Let's get your account set up. This takes just a few minutes and helps you get the most out of the platform.",
    icon: Sparkles,
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Tell us a bit about yourself so leads and team members know who you are.',
    icon: User,
  },
  {
    id: 'business',
    title: 'Business Information',
    description: 'Set up your company details for branded communications.',
    icon: Building2,
  },
  {
    id: 'email',
    title: 'Email Configuration',
    description: 'Connect your email service to send campaigns and automated follow-ups.',
    icon: Mail,
    critical: true,
    criticalWarning: "Without email setup, you won't be able to send campaigns, automated follow-ups, drip sequences, or lead notifications. This is the backbone of your marketing.",
  },
  {
    id: 'sms',
    title: 'SMS & Voice (Twilio)',
    description: 'Connect Twilio to enable text campaigns, automated SMS, and the Cold Call Hub.',
    icon: Phone,
    critical: true,
    criticalWarning: "Without SMS & Voice, you'll miss out on text message campaigns, automated SMS follow-ups, the Cold Call Hub, and voicemail drops — channels with 98% open rates.",
  },
  {
    id: 'google',
    title: 'Google Integration',
    description: 'Sync Gmail, Calendar, and Contacts for a seamless workflow.',
    icon: Globe,
  },
  {
    id: 'security',
    title: 'Secure Your Account',
    description: 'Protect your client data with two-factor authentication.',
    icon: Shield,
    critical: true,
    criticalWarning: "Without 2FA, your account and all client data is protected only by a password. We strongly recommend enabling two-factor authentication.",
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description: "Your account is configured and ready to go. Let's start growing your business!",
    icon: Check,
  },
]

// --- Step Components ---

function WelcomeStep() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-lg font-semibold leading-tight text-foreground mb-3">Welcome to RealEstate Pro!</h2>
      <p className="text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
        We'll walk you through setting up the key parts of your account. This only takes a few minutes
        and you can always change these settings later.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
        {[
          { label: 'Profile & Business', time: '1 min' },
          { label: 'Email & SMS', time: '2 min' },
          { label: 'Integrations & Security', time: '1 min' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileStep() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
    jobTitle: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    settingsApi.getProfile().then((res) => {
      const data = res?.data?.user || res?.user
      if (data) {
        setForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          phone: data.phone || '',
          jobTitle: data.jobTitle || '',
          timezone: data.timezone || prev.timezone,
        }))
      }
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First name and last name are required')
      return
    }
    setSaving(true)
    try {
      await settingsApi.updateProfile(form)
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] })
      toast.success('Profile saved')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">First Name *</label>
          <Input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Last Name *</label>
          <Input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            
            placeholder="Smith"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          
          placeholder="+1 (555) 123-4567"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Job Title</label>
        <Input
          type="text"
          value={form.jobTitle}
          onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
          
          placeholder="Real Estate Agent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Timezone</label>
        <select
          value={form.timezone}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
           className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Pacific/Honolulu'].map((tz) => (
            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  )
}

function BusinessStep() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    companyName: '',
    industry: 'Real Estate',
    companySize: '1-10 employees',
    website: '',
    billingEmail: '',
    phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    settingsApi.getBusinessSettings().then((res) => {
      const data = res?.data?.settings || res?.settings
      if (data) {
        setForm((prev) => ({
          ...prev,
          companyName: data.companyName || '',
          industry: data.industry || 'Real Estate',
          companySize: data.companySize || '1-10 employees',
          website: data.website || '',
          billingEmail: data.billingEmail || '',
          phone: data.phone || '',
        }))
      }
    }).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error('Company name is required')
      return
    }
    setSaving(true)
    try {
      await settingsApi.updateBusinessSettings(form)
      queryClient.invalidateQueries({ queryKey: ['settings', 'business'] })
      toast.success('Business info saved')
    } catch {
      toast.error('Failed to save business info')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Company Name *</label>
        <Input
          type="text"
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          
          placeholder="Pinnacle Realty Group"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Industry</label>
          <select
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
             className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {['Real Estate', 'Real Estate - Residential', 'Real Estate - Commercial', 'Mortgage & Lending', 'Property Management', 'Other'].map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Company Size</label>
          <select
            value={form.companySize}
            onChange={(e) => setForm({ ...form, companySize: e.target.value })}
             className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Website</label>
        <Input
          type="url"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          
          placeholder="https://www.yourcompany.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Business Email</label>
          <Input
            type="email"
            value={form.billingEmail}
            onChange={(e) => setForm({ ...form, billingEmail: e.target.value })}
            
            placeholder="info@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Business Phone</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Saving...' : 'Save Business Info'}
      </Button>
    </div>
  )
}

function EmailStep() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: '587',
    username: 'apikey',
    apiKey: '',
    fromName: '',
    fromEmail: '',
  })
  const [saving, setSaving] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  useEffect(() => {
    settingsApi.getEmailConfig().then((res) => {
      const config = res?.data?.config || res?.config
      if (config) {
        const exists = !!config.hasApiKey
        setHasExisting(exists)
        setConfigSaved(exists)
        setForm((prev) => ({
          ...prev,
          smtpHost: config.smtpHost || 'smtp.sendgrid.net',
          smtpPort: String(config.smtpPort || 587),
          username: config.smtpUser || 'apikey',
          fromName: config.fromName || '',
          fromEmail: config.fromEmail || '',
        }))
      }
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!form.apiKey && !hasExisting) {
      toast.error('SendGrid API key is required')
      return
    }
    if (form.apiKey && !form.apiKey.startsWith('SG.')) {
      toast.error('API key must start with SG.')
      return
    }
    if (!form.fromEmail.trim()) {
      toast.error('From email is required')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        provider: 'sendgrid',
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        smtpHost: form.smtpHost,
        smtpPort: parseInt(form.smtpPort),
        smtpUser: form.username,
        isActive: true,
      }
      if (form.apiKey) payload.apiKey = form.apiKey
      await settingsApi.updateEmailConfig(payload)
      queryClient.invalidateQueries({ queryKey: ['settings', 'emailConfig'] })
      toast.success('Email configuration saved')
      setHasExisting(true)
      setConfigSaved(true)
    } catch {
      toast.error('Failed to save email configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {hasExisting && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
          <Check className="h-4 w-4" />
          Email is already configured. You can update it below or skip this step.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">SendGrid API Key *</label>
        <Input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          className="font-mono text-sm"
          placeholder={hasExisting ? '••••••••••• (key stored)' : 'SG.xxxxxx...'}
        />
        <p className="text-xs text-muted-foreground mt-1">Get your key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SendGrid Dashboard</a></p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">From Name *</label>
          <Input
            type="text"
            value={form.fromName}
            onChange={(e) => setForm({ ...form, fromName: e.target.value })}
            
            placeholder="John at Pinnacle Realty"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">From Email *</label>
          <Input
            type="email"
            value={form.fromEmail}
            onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
            
            placeholder="john@company.com"
          />
        </div>
      </div>
      <details className="group">
        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          Advanced SMTP settings
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">SMTP Host</label>
            <Input
              type="text"
              value={form.smtpHost}
              onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
              
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">SMTP Port</label>
            <select
              value={form.smtpPort}
              onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
               className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {['587', '465', '25', '2525'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </details>
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? 'Saving...' : 'Save Email Config'}
        </Button>
        {configSaved && (
          <Button
            onClick={async () => {
              if (!form.fromEmail.trim()) {
                toast.error('Save your email configuration first')
                return
              }
              setTestingEmail(true)
              try {
                await settingsApi.testEmail({ to: form.fromEmail })
                toast.success(`Test email sent to ${form.fromEmail} — check your inbox!`)
              } catch {
                toast.error('Test email failed. Check your API key and from email settings.')
              } finally {
                setTestingEmail(false)
              }
            }}
            disabled={testingEmail}
            className="bg-success text-white hover:bg-success/90"
          >
            <Send className="h-4 w-4" />
            {testingEmail ? 'Sending...' : 'Test'}
          </Button>
        )}
      </div>
    </div>
  )
}

function SMSStep() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  })
  const [saving, setSaving] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [testingBusy, setTestingBusy] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [testPhone, setTestPhone] = useState('')

  useEffect(() => {
    settingsApi.getSMSConfig().then((res) => {
      const config = res?.data?.config || res?.config
      if (config) {
        const exists = !!config.hasCredentials
        setHasExisting(exists)
        setConfigSaved(exists)
        setForm((prev) => ({
          ...prev,
          accountSid: config.accountSid || '',
          phoneNumber: config.phoneNumber || '',
        }))
      }
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!form.accountSid.trim()) {
      toast.error('Account SID is required')
      return
    }
    if (form.accountSid && !form.accountSid.startsWith('AC')) {
      toast.error('Account SID must start with AC')
      return
    }
    if (!form.authToken && !hasExisting) {
      toast.error('Auth Token is required')
      return
    }
    if (form.authToken && form.authToken.length !== 32) {
      toast.error('Auth Token must be 32 characters')
      return
    }
    if (!form.phoneNumber.trim()) {
      toast.error('Phone number is required')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        provider: 'twilio',
        accountSid: form.accountSid,
        phoneNumber: form.phoneNumber,
        isActive: true,
      }
      if (form.authToken) payload.authToken = form.authToken
      await settingsApi.updateSMSConfig(payload)
      queryClient.invalidateQueries({ queryKey: ['settings', 'smsConfig'] })
      toast.success('Twilio credentials verified and saved')
      setHasExisting(true)
      setConfigSaved(true)
    } catch {
      toast.error('Failed to save Twilio configuration — check your credentials')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {hasExisting && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
          <Check className="h-4 w-4" />
          Twilio is already configured. You can update it below or skip this step.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Account SID *</label>
        <Input
          type="text"
          value={form.accountSid}
          onChange={(e) => setForm({ ...form, accountSid: e.target.value })}
          className="font-mono text-sm"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Auth Token *</label>
        <Input
          type="password"
          value={form.authToken}
          onChange={(e) => setForm({ ...form, authToken: e.target.value })}
          className="font-mono text-sm"
          placeholder={hasExisting ? '••••••••••• (token stored)' : '32-character token'}
        />
        <p className="text-xs text-muted-foreground mt-1">Find it in your <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twilio Console</a></p>
      </div>
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">Twilio Phone Number *</label>
        <Input
          type="tel"
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          
          placeholder="+15551234567"
        />
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Verifying & Saving...' : 'Save Twilio Config'}
      </Button>
      {configSaved && (
        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Send a test SMS to verify everything works:</p>
          <div className="flex gap-3">
            <Input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="flex-1"
              placeholder="+1 your phone number"
            />
            <Button
              onClick={async () => {
                if (!testPhone.trim()) {
                  toast.error('Enter a phone number to send a test SMS')
                  return
                }
                setTestingBusy(true)
                try {
                  await settingsApi.testSMS({ to: testPhone })
                  toast.success(`Test SMS sent to ${testPhone}`)
                } catch {
                  toast.error('Test SMS failed. Verify your Twilio credentials and phone number.')
                } finally {
                  setTestingBusy(false)
                }
              }}
              disabled={testingBusy}
              size="sm"
              className="bg-success text-white hover:bg-success/90"
            >
              <Send className="h-4 w-4" />
              {testingBusy ? 'Sending...' : 'Test SMS'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function GoogleStep() {
  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-2">Google Integration</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-4">
          Google OAuth integration requires setup in your organization's Google Cloud Console.
          You can configure this in <strong>Settings → Integrations</strong> once you have your OAuth credentials ready.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
          <Clock className="h-4 w-4" />
          Configure in Settings after setup
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { name: 'Gmail', desc: 'Sync emails & track opens' },
          { name: 'Calendar', desc: 'Sync appointments' },
          { name: 'Contacts', desc: 'Import & sync contacts' },
        ].map((service) => (
          <div key={service.name} className="p-4 rounded-xl border border-border bg-muted text-center">
            <p className="font-medium text-foreground text-sm">{service.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{service.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
        <p className="font-medium text-foreground/80 mb-2">To set up Google integration:</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Create a project in Google Cloud Console</li>
          <li>Enable Gmail, Calendar, and People APIs</li>
          <li>Create OAuth 2.0 credentials</li>
          <li>Add credentials in Settings → Integrations</li>
        </ol>
      </div>
    </div>
  )
}

function SecurityStep() {
  const { toast } = useToast()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    settingsApi.getSecuritySettings().then((res) => {
      const data = res?.data || res
      if (data?.twoFactorEnabled) setTwoFactorEnabled(true)
      if (data?.emailVerified) setEmailVerified(true)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {twoFactorEnabled ? (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20 text-success">
          <Check className="h-5 w-5" />
          <div>
            <p className="font-medium">Two-factor authentication is enabled</p>
            <p className="text-sm text-success">Your account is secure. You can manage 2FA in Settings.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning/10 mb-4">
              <Shield className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">Protect your account</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Two-factor authentication adds an extra layer of security. We recommend setting this up
              in Settings where you can scan the QR code with your authenticator app.
            </p>
          </div>
          <Button
            onClick={() => {
              toast.info('Head to Settings → Security to set up 2FA with your authenticator app')
            }}
            className="w-full bg-warning text-white hover:bg-warning/90"
          >
            Set Up 2FA in Settings
          </Button>
        </>
      )}

      <div className="p-4 rounded-xl bg-muted border border-border">
        <h4 className="text-sm font-semibold text-foreground/80 mb-3">Security Checklist</h4>
        <ul className="space-y-2">
          {[
            { label: 'Two-factor authentication', done: twoFactorEnabled },
            { label: 'Email verified', done: emailVerified },
          ].map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={item.done ? 'text-foreground/80' : 'text-muted-foreground'}>{item.label}</span>
              {!item.done && (
                <span className="ml-auto text-xs text-warning font-medium">Recommended</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CompleteStep({ skippedSteps }: { skippedSteps: Set<string> }) {
  const criticalSkipped = [...skippedSteps].filter((id) =>
    WIZARD_STEPS.find((s) => s.id === id)?.critical
  )

  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
        <Check className="h-10 w-10 text-success" />
      </div>
      <h2 className="text-lg font-semibold leading-tight text-foreground mb-3">You're all set!</h2>
      <p className="text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
        Your account is configured. You can always change any of these settings later from the Settings page.
      </p>

      {criticalSkipped.length > 0 && (
        <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20 text-left">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-warning">You skipped some important steps</p>
          </div>
          <ul className="space-y-1">
            {criticalSkipped.map((id) => {
              const step = WIZARD_STEPS.find((s) => s.id === id)
              return (
                <li key={id} className="text-sm text-warning flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                  {step?.title} — configure in Settings to unlock full features
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// --- Main Wizard ---

export function SetupWizard() {
  const { user } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [show, setShow] = useState(false)
  const [checking, setChecking] = useState(true)
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set())

  const checkShouldShow = useCallback(async () => {
    if (!user?.id) {
      setChecking(false)
      return
    }

    // Check localStorage first (fast path, avoids flicker)
    const localCompleted = getUserItem(user.id, SETUP_WIZARD_KEY)
    if (localCompleted) {
      setChecking(false)
      return
    }

    // Check server-side status
    try {
      const res = await settingsApi.getSetupStatus()
      const data = res?.data
      if (data?.setupCompletedAt) {
        // Server says completed — sync to localStorage
        setUserItem(user.id, SETUP_WIZARD_KEY, 'completed')
        setChecking(false)
        return
      }
    } catch {
      // If API fails, fall back to showing wizard for new users
    }

    // Not completed — show wizard
    setShow(true)
    setChecking(false)
  }, [user?.id])

  useEffect(() => {
    checkShouldShow()
  }, [checkShouldShow])

  if (checking || !show) return null

  const step = WIZARD_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === WIZARD_STEPS.length - 1
  const isConfigStep = !['welcome', 'complete'].includes(step.id)
  const progress = ((currentStep) / (WIZARD_STEPS.length - 1)) * 100

  const handleNext = () => {
    if (isLast) {
      handleFinish()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const handleSkipStep = () => {
    setSkippedSteps((prev) => new Set([...prev, step.id]))
    handleNext()
  }

  const handleSkipAll = () => {
    if (user?.id) {
      setUserItem(user.id, SETUP_WIZARD_KEY, 'skipped')
      // Also persist on server so it syncs across devices
      settingsApi.completeSetup().catch(() => {})
    }
    setShow(false)
  }

  const handleFinish = () => {
    if (user?.id) {
      setUserItem(user.id, SETUP_WIZARD_KEY, 'completed')
      // Persist on server
      settingsApi.completeSetup().catch(() => {})
    }
    setShow(false)
  }

  const renderStep = () => {
    switch (step.id) {
      case 'welcome': return <WelcomeStep />
      case 'profile': return <ProfileStep />
      case 'business': return <BusinessStep />
      case 'email': return <EmailStep />
      case 'sms': return <SMSStep />
      case 'google': return <GoogleStep />
      case 'security': return <SecurityStep />
      case 'complete': return <CompleteStep skippedSteps={skippedSteps} />
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${step.critical ? 'bg-warning/10' : 'bg-primary/10'}`}>
              <step.icon className={`h-5 w-5 ${step.critical ? 'text-warning' : 'text-primary'}`} />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {WIZARD_STEPS.length}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            title="Skip setup and configure later"
            aria-label="Skip setup and configure later"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Set up later</span>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Critical warning banner */}
          {step.critical && step.criticalWarning && (
            <div className="mb-6 p-4 rounded-xl bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning mb-1">Important for your experience</p>
                  <p className="text-sm text-warning">{step.criticalWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step description */}
          {isConfigStep && (
            <p className="text-muted-foreground text-sm mb-6">{step.description}</p>
          )}

          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/50">
          <div>
            {!isFirst && (
              <Button
                variant="ghost"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isConfigStep && (
              <Button
                variant="ghost"
                onClick={handleSkipStep}
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
            >
              {isLast ? 'Go to Dashboard' : isFirst ? 'Get Started' : 'Continue'}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
