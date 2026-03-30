import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocketEvent, onReconnect } from './useSocket'
import { useToast } from './useToast'

/**
 * Subscribe to real-time WebSocket events and invalidate relevant queries.
 * On reconnect, silently refetch notifications and all active queries
 * so the UI catches up with anything missed while disconnected.
 */
export function useRealtimeUpdates() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // On reconnect — fetch missed notifications + invalidate all active queries
  useEffect(() => {
    return onReconnect(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    })
  }, [queryClient])

  // Lead updates (create, update, delete, import)
  useSocketEvent<{ type: string; leadId?: string; count?: number }>('lead:update', (event) => {
    queryClient.invalidateQueries({ queryKey: ['leads'] })
    queryClient.invalidateQueries({ queryKey: ['call-queue'] })

    if (event.type === 'imported' && event.count) {
      toast.info(`${event.count} lead(s) imported by a team member`)
    }
  })

  // Campaign updates
  useSocketEvent<{ id: string; name: string; status: string }>('campaign:update', (event) => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    queryClient.invalidateQueries({ queryKey: ['campaign', event.id] })
    if (event.status === 'COMPLETED') {
      toast.info(`Campaign "${event.name}" finished sending`)
    }
  })

  // Workflow events
  useSocketEvent<{ workflowId: string; workflowName: string; action: string }>('workflow:event', () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] })
    queryClient.invalidateQueries({ queryKey: ['workflow-executions'] })
  })

  // Message updates (inbound emails/SMS)
  useSocketEvent<{ type: string; messageId?: string; channel?: string; leadId?: string }>('message:update', (event) => {
    queryClient.invalidateQueries({ queryKey: ['messages'] })
    queryClient.invalidateQueries({ queryKey: ['communication'] })
    if (event.leadId) {
      queryClient.invalidateQueries({ queryKey: ['lead-communications', event.leadId] })
    }
  })

  // Task updates (created, updated, deleted, completed)
  useSocketEvent<{ type: string; taskId?: string; assignedToId?: string }>('task:update', () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    queryClient.invalidateQueries({ queryKey: ['task-stats'] })
  })

  // Call updates (logged, inbound)
  useSocketEvent<{ type: string; callId?: string; leadId?: string }>('call:update', (event) => {
    queryClient.invalidateQueries({ queryKey: ['calls'] })
    queryClient.invalidateQueries({ queryKey: ['call-queue'] })
    queryClient.invalidateQueries({ queryKey: ['call-stats'] })
    if (event.leadId) {
      queryClient.invalidateQueries({ queryKey: ['lead-communications', event.leadId] })
    }
  })

  // Follow-up reminder due
  useSocketEvent<{ reminderId: string; leadId: string; userId: string }>('reminder:due', (event) => {
    queryClient.invalidateQueries({ queryKey: ['reminders'] })
    queryClient.invalidateQueries({ queryKey: ['follow-up-reminders'] })
    if (event.leadId) {
      queryClient.invalidateQueries({ queryKey: ['lead', event.leadId] })
    }
  })
}
