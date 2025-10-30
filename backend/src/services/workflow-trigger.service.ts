import { prisma } from '../config/database'
import type { WorkflowTrigger, Workflow } from '@prisma/client'

/**
 * Workflow Trigger Detection Service
 * 
 * Detects when workflows should be triggered based on system events
 * and evaluates conditions to determine if workflow should execute
 */

interface TriggerEvent {
  type: WorkflowTrigger
  data: Record<string, unknown>
  leadId?: string
}

interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists'
  value: unknown
}

export class WorkflowTriggerService {
  /**
   * Detect and queue workflows that match the given event
   * 
   * @param event - The trigger event that occurred
   * @returns Array of matched workflows
   */
  async detectTriggers(event: TriggerEvent): Promise<Workflow[]> {
    try {
      // Find all active workflows with matching trigger type
      const matchingWorkflows = await prisma.workflow.findMany({
        where: {
          isActive: true,
          triggerType: event.type,
        },
      })

      const triggeredWorkflows: Workflow[] = []

      // Evaluate conditions for each workflow
      for (const workflow of matchingWorkflows) {
        const conditionsMatch = await this.evaluateConditions(workflow, event.data)
        
        if (conditionsMatch) {
          // Queue the workflow for execution
          await this.queueWorkflow(workflow.id, event.data, event.leadId)
          triggeredWorkflows.push(workflow)
        }
      }

      console.log(`🔔 Trigger detected: ${event.type}`)
      console.log(`   Matched workflows: ${triggeredWorkflows.length}`)
      
      return triggeredWorkflows
    } catch (error) {
      console.error('Error detecting triggers:', error)
      throw error
    }
  }

  /**
   * Evaluate if workflow conditions match the event data
   * 
   * @param workflow - The workflow to evaluate
   * @param eventData - The data from the trigger event
   * @returns True if conditions match, false otherwise
   */
  async evaluateConditions(
    workflow: Workflow,
    eventData: Record<string, unknown>
  ): Promise<boolean> {
    // If no triggerData or conditions, workflow always matches
    const triggerData = workflow.triggerData as Record<string, unknown> | null
    if (!triggerData || !triggerData.conditions) {
      return true
    }

    const conditions = triggerData.conditions as WorkflowCondition[]

    // All conditions must match (AND logic)
    for (const condition of conditions) {
      const fieldValue = this.getNestedValue(eventData, condition.field)
      const conditionMet = this.evaluateCondition(fieldValue, condition.operator, condition.value)
      
      console.log(`   Condition check: ${condition.field} ${condition.operator} ${condition.value}`)
      console.log(`   Field value: ${fieldValue}, Match: ${conditionMet}`)
      
      if (!conditionMet) {
        return false
      }
    }

    return true
  }

  /**
   * Queue a workflow for execution
   * Creates a PENDING execution record
   * 
   * @param workflowId - The workflow to queue
   * @param eventData - The event data to pass to workflow
   * @param leadId - Optional lead ID associated with event
   */
  async queueWorkflow(
    workflowId: string,
    eventData: Record<string, unknown>,
    leadId?: string
  ): Promise<void> {
    try {
      // Serialize event data for storage (remove complex nested objects)
      const serializedData = JSON.parse(JSON.stringify(eventData, (key, value) => {
        // Skip functions and undefined values
        if (typeof value === 'function' || value === undefined) {
          return undefined
        }
        // Convert dates to ISO strings
        if (value instanceof Date) {
          return value.toISOString()
        }
        return value
      }))

      // Create execution record
      await prisma.workflowExecution.create({
        data: {
          workflowId,
          status: 'PENDING',
          leadId,
          metadata: {
            eventData: serializedData,
            queuedAt: new Date().toISOString(),
          },
          startedAt: new Date(),
        },
      })

      // Update workflow stats
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          executions: { increment: 1 },
          lastRunAt: new Date(),
        },
      })

      console.log(`📝 Workflow queued for execution: ${workflowId}`)
    } catch (error) {
      console.error('Error queueing workflow:', error)
      throw error
    }
  }

  /**
   * Get nested value from object using dot notation
   * 
   * @param obj - The object to get value from
   * @param path - Dot notation path (e.g., 'lead.status')
   * @returns The value at the path, or undefined
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  /**
   * Evaluate a single condition
   * 
   * @param fieldValue - The actual value from event data
   * @param operator - The comparison operator
   * @param expectedValue - The expected value to compare against
   * @returns True if condition is met
   */
  private evaluateCondition(
    fieldValue: unknown,
    operator: WorkflowCondition['operator'],
    expectedValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      
      case 'not_equals':
        return fieldValue !== expectedValue
      
      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(String(expectedValue).toLowerCase())
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(expectedValue)
        }
        return false
      
      case 'not_contains':
        if (typeof fieldValue === 'string') {
          return !fieldValue.toLowerCase().includes(String(expectedValue).toLowerCase())
        }
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(expectedValue)
        }
        return true
      
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      
      default:
        console.warn(`Unknown operator: ${operator}`)
        return false
    }
  }
}

// Export singleton instance
export const workflowTriggerService = new WorkflowTriggerService()
