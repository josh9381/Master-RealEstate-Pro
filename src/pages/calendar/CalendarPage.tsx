import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Users, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')

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

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const today = new Date()
  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  // Sample events
  const events = [
    { id: 1, title: 'Meeting with John Doe', time: '10:00 AM', type: 'meeting', day: 15 },
    { id: 2, title: 'Property Viewing', time: '2:00 PM', type: 'viewing', day: 15 },
    { id: 3, title: 'Team Standup', time: '9:00 AM', type: 'meeting', day: 18 },
    { id: 4, title: 'Client Call', time: '3:00 PM', type: 'call', day: 20 },
    { id: 5, title: 'Contract Signing', time: '11:00 AM', type: 'meeting', day: 22 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your schedule and meetings</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xl font-semibold min-w-[200px] text-center">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <Button variant="outline" size="sm" onClick={nextMonth}>
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
            <Button variant="outline" size="sm">
              Today
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day Headers */}
          {DAYS.map(day => (
            <div key={day} className="bg-muted p-3 text-center font-semibold text-sm">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="bg-card p-3 h-24" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1
            const dayEvents = events.filter(e => e.day === day)
            
            return (
              <div
                key={day}
                className={`bg-card p-3 h-24 hover:bg-accent cursor-pointer transition-colors ${
                  isToday(day) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Upcoming Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Events</h3>
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
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
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Schedule Team Meeting
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Book Property Viewing
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Video className="h-4 w-4 mr-2" />
              Create Video Call
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Set Reminder
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
