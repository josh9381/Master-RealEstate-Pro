import { logger } from '@/lib/logger'
import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users, Video, Loader2, MapPin, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ModalErrorBoundary } from '@/components/ModalErrorBoundary'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { appointmentsApi, CreateAppointmentData, UpdateAppointmentData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { useConfirm } from '@/hooks/useConfirm'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const EVENT_TYPES = [
  { value: 'MEETING', label: 'Meeting' },
  { value: 'CALL', label: 'Call' },
  { value: 'DEMO', label: 'Demo / Viewing' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
] as const

type EventType = 'CALL' | 'MEETING' | 'DEMO' | 'CONSULTATION' | 'FOLLOW_UP'

interface CalendarEvent {
  id: string
  title: string
  time: string
  type: string
  day: number
  date: Date
  description?: string
  location?: string
  duration?: number
  scheduledAt: string
  leadId?: string
  status?: string
}

export default function CalendarPage() {
  const { toast } = useToast()
  const showConfirm = useConfirm()
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'MEETING' as EventType,
    date: '',
    time: '09:00',
    duration: 60,
    location: '',
    leadId: '',
  })

  // Fetch real appointments from API
  const { data: appointmentsResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['appointments', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: () => appointmentsApi.getAppointments({
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString(),
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString(),
    }),
  })

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentsApi.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Event created successfully')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to create event')
    },
  })

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentData }) => appointmentsApi.updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Event updated successfully')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to update event')
    },
  })

  // Delete appointment mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Event cancelled')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to cancel event')
    },
  })

  // Map API appointments to calendar event format
  const events: CalendarEvent[] = useMemo(() => {
    const appts = appointmentsResponse?.data?.appointments || appointmentsResponse?.appointments || appointmentsResponse || []
    if (!Array.isArray(appts)) return []
    return appts
      .filter((appt: { status?: string }) => appt.status !== 'CANCELLED')
      .map((appt: { id?: string; _id?: string; startTime?: string; endTime?: string; scheduledAt?: string; date?: string; title?: string; type?: string; description?: string; location?: string; duration?: number; leadId?: string; status?: string }) => {
      const date = new Date(appt.startTime || appt.scheduledAt || appt.date || new Date())
      const duration = appt.duration || (appt.startTime && appt.endTime ? Math.round((new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60000) : 60)
      return {
        id: appt.id || appt._id || '',
        title: appt.title || 'Appointment',
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: appt.type || 'MEETING',
        day: date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear() ? date.getDate() : -1,
        date,
        description: appt.description || '',
        location: appt.location || '',
        duration,
        scheduledAt: appt.startTime || appt.scheduledAt || appt.date || '',
        leadId: appt.leadId || '',
        status: appt.status || 'SCHEDULED',
      }
    })
  }, [appointmentsResponse, currentDate])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)

  const prevPeriod = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    } else if (view === 'week') {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 1)
      setCurrentDate(d)
    }
  }

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    } else if (view === 'week') {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 1)
      setCurrentDate(d)
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  // Modal helpers
  const openCreateModal = (prefilledDate?: Date, prefilledType?: EventType) => {
    setEditingEvent(null)
    const d = prefilledDate || new Date()
    setEventForm({
      title: '',
      description: '',
      type: prefilledType || 'MEETING',
      date: d.toISOString().split('T')[0],
      time: '09:00',
      duration: 60,
      location: '',
      leadId: '',
    })
    setShowEventModal(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    const d = new Date(event.scheduledAt)
    setEventForm({
      title: event.title,
      description: event.description || '',
      type: event.type as EventType,
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      duration: event.duration || 60,
      location: event.location || '',
      leadId: event.leadId || '',
    })
    setShowEventModal(true)
  }

  const closeModal = () => {
    setShowEventModal(false)
    setEditingEvent(null)
  }

  const handleSubmitEvent = () => {
    if (!eventForm.title.trim()) {
      toast.error('Event title is required')
      return
    }
    if (!eventForm.date) {
      toast.error('Date is required')
      return
    }

    const startTime = new Date(`${eventForm.date}T${eventForm.time || '09:00'}:00`).toISOString()
    const endTime = new Date(new Date(`${eventForm.date}T${eventForm.time || '09:00'}:00`).getTime() + (eventForm.duration || 60) * 60000).toISOString()

    if (editingEvent) {
      const updateData: UpdateAppointmentData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        type: eventForm.type,
        startTime,
        endTime,
        location: eventForm.location.trim() || undefined,
      }
      updateMutation.mutate({ id: editingEvent.id, data: updateData })
    } else {
      const createData: CreateAppointmentData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        type: eventForm.type,
        startTime,
        endTime,
        location: eventForm.location.trim() || undefined,
        leadId: eventForm.leadId || undefined,
      }
      createMutation.mutate(createData)
    }
  }

  const handleDeleteEvent = async () => {
    if (editingEvent && await showConfirm({ title: 'Cancel Event', message: 'Are you sure you want to cancel this event?', confirmLabel: 'Cancel Event', variant: 'destructive' })) {
      deleteMutation.mutate(editingEvent.id)
    }
  }

  // Click handlers for day cells
  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    openCreateModal(date)
  }

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    openEditModal(event)
  }

  // Week view helpers
  const getWeekDates = () => {
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(e => {
      const ed = e.date
      return ed.getFullYear() === date.getFullYear() && 
             ed.getMonth() === date.getMonth() && 
             ed.getDate() === date.getDate()
    })
  }

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12
    const ampm = hour < 12 ? 'AM' : 'PM'
    return `${h} ${ampm}`
  }

  const getHeaderText = () => {
    if (view === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    } else if (view === 'week') {
      const weekDates = getWeekDates()
      const start = weekDates[0]
      const end = weekDates[6]
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
      }
      return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} - ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`
    } else {
      return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const getEventColor = (type: string) => {
    switch (type) {
      case 'MEETING': return 'bg-primary/10 text-primary'
      case 'DEMO': return 'bg-success/10 text-success'
      case 'CONSULTATION': return 'bg-info/10 text-info'
      case 'FOLLOW_UP': return 'bg-warning/10 text-warning'
      case 'CALL': return 'bg-primary/10 text-primary'
      default: return 'bg-primary/10 text-primary'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar" subtitle="Manage your schedule and meetings" />
        <LoadingSkeleton rows={5} showChart />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Calendar" subtitle="Manage your schedule and meetings" />
        <ErrorBanner message={`Failed to load calendar: ${error instanceof Error ? error.message : 'Unknown error'}`} retry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Calendar"
        subtitle="Manage your schedule and meetings"
        actions={
          <Button onClick={() => openCreateModal()}>
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        }
      />

      {/* Calendar Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xl font-semibold min-w-[200px] text-center">
              {getHeaderText()}
            </div>
            <Button variant="outline" size="sm" onClick={nextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={view === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('week')}
            >
              Week
            </Button>
            <Button
              variant={view === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('day')}
            >
              Day
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Month View */}
        {view === 'month' && (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {DAYS.map(day => (
              <div key={day} className="bg-muted p-3 text-center font-semibold text-sm">
                {day}
              </div>
            ))}

            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="bg-card p-3 h-24" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const dayEvents = events.filter(e => e.day === day)
              
              return (
                <div
                  key={day}
                  className={`bg-card p-3 h-24 hover:bg-accent cursor-pointer transition-colors ${
                    isToday(day) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${getEventColor(event.type)}`}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        {event.time} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="overflow-auto max-h-[600px]">
            <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden min-w-[800px]">
              {/* Header row */}
              <div className="bg-muted p-2 text-center text-xs font-semibold" />
              {getWeekDates().map((date) => {
                const isTodayDate = date.toDateString() === today.toDateString()
                return (
                  <div key={date.toISOString()} className={`bg-muted p-2 text-center text-xs font-semibold ${isTodayDate ? 'text-primary' : ''}`}>
                    {DAYS[date.getDay()]} {date.getDate()}
                  </div>
                )
              })}

              {/* Time slots */}
              {HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div key={`hour-${hour}`} className="bg-card p-1 text-xs text-muted-foreground text-right pr-2 h-12 border-r">
                    {formatHour(hour)}
                  </div>
                  {getWeekDates().map((date, dayIdx) => {
                    const dayEvents = getEventsForDate(date).filter(e => e.date.getHours() === hour)
                    return (
                      <div
                        key={`${hour}-${dayIdx}`}
                        className="bg-card p-0.5 h-12 hover:bg-accent cursor-pointer transition-colors border-b border-border/50"
                        onClick={() => {
                          const d = new Date(date)
                          d.setHours(hour, 0, 0, 0)
                          openCreateModal(d)
                        }}
                      >
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className={`text-xs p-0.5 rounded truncate cursor-pointer ${getEventColor(event.type)}`}
                            onClick={(e) => handleEventClick(event, e)}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Day View */}
        {view === 'day' && (
          <div className="overflow-auto max-h-[600px]">
            <div className="min-w-[400px]">
              {HOURS.map(hour => {
                const hourEvents = getEventsForDate(currentDate).filter(e => e.date.getHours() === hour)
                return (
                  <div
                    key={hour}
                    className="flex border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => {
                      const d = new Date(currentDate)
                      d.setHours(hour, 0, 0, 0)
                      openCreateModal(d)
                    }}
                  >
                    <div className="w-20 p-2 text-sm text-muted-foreground text-right pr-4 shrink-0 border-r">
                      {formatHour(hour)}
                    </div>
                    <div className="flex-1 p-1 min-h-[3rem]">
                      {hourEvents.map(event => (
                        <div
                          key={event.id}
                          className={`text-sm p-2 rounded mb-1 cursor-pointer hover:opacity-80 ${getEventColor(event.type)}`}
                          onClick={(e) => handleEventClick(event, e)}
                        >
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs opacity-75">{event.time} • {event.duration || 60}min{event.location ? ` • ${event.location}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Upcoming Events + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">No events this month</p>
            )}
            {events
              .filter(e => e.date >= new Date())
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 5).map(event => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                onClick={() => openEditModal(event)}
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                    {event.location && (
                      <>
                        <MapPin className="h-3 w-3 ml-2" />
                        {event.location}
                      </>
                    )}
                  </div>
                </div>
                <Badge>{event.type}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={() => openCreateModal(undefined, 'MEETING')}>
              <Users className="h-4 w-4 mr-2" />
              Schedule Team Meeting
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => openCreateModal(undefined, 'DEMO')}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Book Property Viewing
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => openCreateModal(undefined, 'CONSULTATION')}>
              <Video className="h-4 w-4 mr-2" />
              Create Video Call
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => openCreateModal(undefined, 'FOLLOW_UP')}>
              <Clock className="h-4 w-4 mr-2" />
              Set Follow-up
            </Button>
          </div>
        </Card>
      </div>

      {/* Create/Edit Event Modal */}
      <Dialog open={showEventModal} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md">
          <ModalErrorBoundary name="Event Editor" onClose={closeModal}>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                placeholder="Event title..."
                value={eventForm.title}
                onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-type">Type</Label>
              <select
                id="event-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={eventForm.type}
                onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value as EventType }))}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-duration">Duration (minutes)</Label>
              <Input
                id="event-duration"
                type="number"
                min="15"
                step="15"
                value={eventForm.duration}
                onChange={(e) => setEventForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="Meeting location..."
                value={eventForm.location}
                onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <textarea
                id="event-description"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Event details..."
                value={eventForm.description}
                onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            {editingEvent && (
              <div className="flex gap-2 mr-auto">
                <Button
                  variant="outline"
                  onClick={handleDeleteEvent}
                  disabled={isMutating}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Cancel Event
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const blob = await appointmentsApi.exportICS(editingEvent.id);
                      const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: 'text/calendar' }));
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `appointment-${editingEvent.id}.ics`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast.success('Calendar file downloaded');
                    } catch (error) {
                      logger.error('Failed to export calendar file:', error)
                      toast.error('Failed to export calendar file');
                    }
                  }}
                  disabled={isMutating}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Add to Calendar
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={closeModal} disabled={isMutating}>
              Close
            </Button>
            <Button onClick={handleSubmitEvent} disabled={isMutating}>
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEvent ? 'Save Changes' : 'Create Event'}
            </Button>
          </DialogFooter>
          </ModalErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  )
}
