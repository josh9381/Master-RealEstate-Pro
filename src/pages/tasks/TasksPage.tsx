import { useState } from 'react'
import { Plus, Filter, CheckCircle2, Circle, Clock, Flag, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'

export default function TasksPage() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const tasks = [
    {
      id: 1,
      title: 'Follow up with John Doe',
      description: 'Send property brochure and schedule viewing',
      priority: 'high',
      dueDate: 'Today',
      assignee: 'Sarah Johnson',
      completed: false,
      category: 'follow-up'
    },
    {
      id: 2,
      title: 'Prepare contract for ABC Corp',
      description: 'Review terms and prepare final contract',
      priority: 'high',
      dueDate: 'Tomorrow',
      assignee: 'Mike Davis',
      completed: false,
      category: 'contract'
    },
    {
      id: 3,
      title: 'Schedule property viewing',
      description: 'Downtown office space - 3 potential clients',
      priority: 'medium',
      dueDate: 'Mar 25',
      assignee: 'Emily Brown',
      completed: false,
      category: 'viewing'
    },
    {
      id: 4,
      title: 'Send monthly report',
      description: 'Compile and send sales report to management',
      priority: 'medium',
      dueDate: 'Mar 30',
      assignee: 'John Smith',
      completed: false,
      category: 'admin'
    },
    {
      id: 5,
      title: 'Update CRM data',
      description: 'Import new leads from marketing campaign',
      priority: 'low',
      dueDate: 'Next Week',
      assignee: 'Sarah Johnson',
      completed: true,
      category: 'admin'
    },
  ]

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed' && !task.completed) return false
    if (filter === 'active' && task.completed) return false
    if (filter === 'high' && task.priority !== 'high') return false
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !task.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your to-do list and assignments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => !t.completed).length}</div>
          <div className="text-sm text-muted-foreground">Active Tasks</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => t.dueDate === 'Today').length}</div>
          <div className="text-sm text-muted-foreground">Due Today</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => t.priority === 'high').length}</div>
          <div className="text-sm text-muted-foreground">High Priority</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => t.completed).length}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed
            </Button>
            <Button
              variant={filter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('high')}
            >
              <Flag className="h-4 w-4 mr-2" />
              High Priority
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More
            </Button>
          </div>
        </div>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`p-4 ${task.completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <button className="mt-1">
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className={`font-semibold ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{task.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{task.assignee}</span>
                  </div>
                  <Badge variant="outline">{task.category}</Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found matching your filters</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
