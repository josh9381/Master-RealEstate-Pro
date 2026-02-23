import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Filter, CheckCircle2, Circle, Clock, Flag, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { tasksApi, CreateTaskData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface Task {
  id: number | string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  assignee: string
  completed: boolean
  category: string
  status: 'pending' | 'completed' | 'cancelled'
}

// Empty fallback - no hardcoded tasks
const fallbackTasks: Task[] = []

export default function TasksPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch tasks from API
  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      try {
        const params: {
          status?: 'pending' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
        } = {}
        
        if (filter === 'completed') params.status = 'completed'
        if (filter === 'active') params.status = 'pending'
        if (filter === 'high') params.priority = 'high'
        
        const response = await tasksApi.getTasks(params)
        return response.data
      } catch (error) {
        return null
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Smart data source - use API data or fallback to hardcoded tasks
  const tasks: Task[] = useMemo(() => {
    if (tasksResponse?.tasks && tasksResponse.tasks.length > 0) {
      // Transform API tasks to match component structure
      return tasksResponse.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate || 'No date',
        assignee: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
        completed: task.status === 'completed',
        category: task.category || 'general',
        status: task.status
      }))
    }
    return fallbackTasks
  }, [tasksResponse])

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
    },
    onError: () => {
      toast.error('Failed to create task')
    },
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete task')
    },
  })

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task completed')
    },
    onError: () => {
      toast.error('Failed to complete task')
    },
  })

  const handleToggleComplete = (taskId: number | string) => {
    completeTaskMutation.mutate(String(taskId))
  }

  const handleCreateTask = () => {
    const title = prompt('Task title:')
    if (!title) return
    const description = prompt('Description (optional):') || ''
    const priority = (prompt('Priority (low/medium/high):') || 'medium') as 'low' | 'medium' | 'high'
    createTaskMutation.mutate({ title, description, priority })
  }

  const handleDeleteTask = (taskId: number | string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(String(taskId))
    }
  }

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
        <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {createTaskMutation.isPending ? 'Creating...' : 'New Task'}
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
              <button className="mt-1" onClick={() => handleToggleComplete(task.id)}>
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
                  <button
                    className="ml-auto text-xs text-destructive hover:underline"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">{tasks.length === 0 ? 'No tasks yet' : 'No tasks found matching your filters'}</p>
              {tasks.length === 0 && (
                <p className="text-sm">Create your first task to get started!</p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
