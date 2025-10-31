import { prisma } from '../config/database'
import type { Workflow, WorkflowExecution } from '@prisma/client'

/**
 * Workflow Executor Service
 * 
 * Executes workflow actions when workflows are triggered
 * Handles different action types and manages execution state
 */

interface WorkflowAction {
  type: 'SEND_EMAIL' | 'SEND_SMS' | 'CREATE_TASK' | 'UPDATE_STATUS' | 'ADD_TAG' | 'WAIT'
  config: Record<string, unknown>
  delay?: number
}

interface ExecutionContext {
  workflowId: string
  executionId: string
  leadId?: string
  eventData: Record<string, unknown>
  lead?: any
}

export class WorkflowExecutorService {
  /**
   * Execute an entire workflow
   * 
   * @param workflowId - The workflow to execute
   * @param eventData - Data from the trigger event
   * @param leadId - Optional lead ID
   * @returns The workflow execution record
   */
  async executeWorkflow(
    workflowId: string,
    eventData: Record<string, unknown>,
    leadId?: string
  ): Promise<WorkflowExecution> {
    console.log(`\n🔄 Executing workflow: ${workflowId}`)
    
    try {
      // Get the workflow
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      })

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      // Get lead data if leadId provided
      let lead = null
      if (leadId) {
        lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: {
            assignedTo: true,
            tags: true,
          },
        })
      }

      // Find the execution record (should already exist from trigger service)
      const execution = await prisma.workflowExecution.findFirst({
        where: {
          workflowId,
          leadId,
          status: 'PENDING',
        },
        orderBy: {
          startedAt: 'desc',
        },
      })

      if (!execution) {
        throw new Error('Execution record not found')
      }

      const context: ExecutionContext = {
        workflowId,
        executionId: execution.id,
        leadId,
        eventData,
        lead,
      }

      // Parse actions from workflow
      const actions = workflow.actions as WorkflowAction[]

      console.log(`   Actions to execute: ${actions.length}`)

      // Execute each action in sequence
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        console.log(`   [${i + 1}/${actions.length}] Executing action: ${action.type}`)

        try {
          await this.executeAction(action, context)
          console.log(`   ✅ Action ${action.type} completed`)
        } catch (error) {
          console.error(`   ❌ Action ${action.type} failed:`, error)
          
          // Mark execution as failed
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'FAILED',
              error: error instanceof Error ? error.message : 'Unknown error',
              completedAt: new Date(),
            },
          })

          throw error
        }

        // Handle delay if specified
        if (action.delay && action.delay > 0) {
          console.log(`   ⏱️  Waiting ${action.delay} seconds...`)
          // In production, this would be handled by a job queue
          // For now, we'll just log it
        }
      }

      // Mark execution as successful
      const completedExecution = await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      })

      console.log(`   ✅ Workflow execution completed successfully`)

      return completedExecution
    } catch (error) {
      console.error(`   ❌ Workflow execution failed:`, error)
      throw error
    }
  }

  /**
   * Execute a single action
   * 
   * @param action - The action to execute
   * @param context - Execution context with lead and event data
   */
  async executeAction(
    action: WorkflowAction,
    context: ExecutionContext
  ): Promise<void> {
    switch (action.type) {
      case 'SEND_EMAIL':
        await this.sendEmailAction(action.config, context)
        break
      
      case 'SEND_SMS':
        await this.sendSMSAction(action.config, context)
        break
      
      case 'CREATE_TASK':
        await this.createTaskAction(action.config, context)
        break
      
      case 'UPDATE_STATUS':
        await this.updateStatusAction(action.config, context)
        break
      
      case 'ADD_TAG':
        await this.addTagAction(action.config, context)
        break
      
      case 'WAIT':
        await this.waitAction(action.config)
        break
      
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  /**
   * SEND_EMAIL action handler
   * For now, this is a mock implementation
   */
  private async sendEmailAction(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    const { templateId, to, subject, body } = config

    // Replace variables in email fields
    const processedTo = this.replaceVariables(to as string, context)
    const processedSubject = this.replaceVariables(subject as string, context)
    const processedBody = this.replaceVariables(body as string, context)

    console.log(`      📧 Mock Email:`)
    console.log(`         To: ${processedTo}`)
    console.log(`         Subject: ${processedSubject}`)
    if (processedBody) {
      console.log(`         Body: ${processedBody.substring(0, 100)}...`)
    }
    if (templateId) {
      console.log(`         Template: ${templateId}`)
    }

    // Log activity
    if (context.leadId) {
      await prisma.activity.create({
        data: {
          type: 'EMAIL_SENT',
          title: 'Workflow email sent',
          description: `Email sent via workflow: ${processedSubject || 'No subject'}`,
          leadId: context.leadId,
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId,
            to: processedTo,
            subject: processedSubject,
          },
        },
      })
    }
  }

  /**
   * SEND_SMS action handler
   * For now, this is a mock implementation
   */
  private async sendSMSAction(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    const { to, message } = config

    const processedTo = this.replaceVariables(to as string, context)
    const processedMessage = this.replaceVariables(message as string, context)

    console.log(`      📱 Mock SMS:`)
    console.log(`         To: ${processedTo}`)
    console.log(`         Message: ${processedMessage}`)

    // Log activity
    if (context.leadId) {
      await prisma.activity.create({
        data: {
          type: 'SMS_SENT',
          title: 'Workflow SMS sent',
          description: `SMS sent via workflow: ${processedMessage?.substring(0, 50)}`,
          leadId: context.leadId,
          metadata: {
            workflowId: context.workflowId,
            executionId: context.executionId,
            to: processedTo,
            message: processedMessage,
          },
        },
      })
    }
  }

  /**
   * CREATE_TASK action handler
   */
  private async createTaskAction(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    const { title, description, dueDate, priority } = config

    const processedTitle = this.replaceVariables(title as string, context)
    const processedDescription = this.replaceVariables(description as string, context)

    // Parse due date (e.g., "+3 days", "2024-12-31")
    let dueDateValue: Date | undefined
    if (dueDate) {
      dueDateValue = this.parseDueDate(dueDate as string)
    }

    console.log(`      ✅ Creating Task:`)
    console.log(`         Title: ${processedTitle}`)
    if (processedDescription) {
      console.log(`         Description: ${processedDescription}`)
    }
    if (dueDateValue) {
      console.log(`         Due: ${dueDateValue.toISOString()}`)
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: processedTitle,
        description: processedDescription as string | undefined,
        dueDate: dueDateValue,
        priority: (priority as string) || 'MEDIUM',
        status: 'PENDING',
        leadId: context.leadId,
      },
    })

    console.log(`         Created task: ${task.id}`)
  }

  /**
   * UPDATE_STATUS action handler
   */
  private async updateStatusAction(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    const { status } = config

    if (!context.leadId) {
      console.warn('      ⚠️  Cannot update status: no leadId in context')
      return
    }

    console.log(`      🔄 Updating lead status to: ${status}`)

    await prisma.lead.update({
      where: { id: context.leadId },
      data: { status: status as string },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'STATUS_CHANGED',
        title: 'Status changed by workflow',
        description: `Lead status changed to ${status} by workflow`,
        leadId: context.leadId,
        metadata: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          newStatus: status,
        },
      },
    })
  }

  /**
   * ADD_TAG action handler
   */
  private async addTagAction(
    config: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<void> {
    const { tagName, tagColor } = config

    if (!context.leadId) {
      console.warn('      ⚠️  Cannot add tag: no leadId in context')
      return
    }

    console.log(`      🏷️  Adding tag: ${tagName}`)

    // Find or create the tag
    let tag = await prisma.tag.findUnique({
      where: { name: tagName as string },
    })

    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          name: tagName as string,
          color: (tagColor as string) || 'blue',
        },
      })
    }

    // Check if lead already has this tag
    const lead = await prisma.lead.findUnique({
      where: { id: context.leadId },
      include: { tags: true },
    })

    const hasTag = lead?.tags.some(t => t.id === tag.id)

    if (!hasTag) {
      // Add tag to lead using Prisma's many-to-many relation
      await prisma.lead.update({
        where: { id: context.leadId },
        data: {
          tags: {
            connect: { id: tag.id },
          },
        },
      })
      console.log(`         Tag added: ${tag.name}`)
    } else {
      console.log(`         Tag already exists: ${tag.name}`)
    }
  }

  /**
   * WAIT action handler
   */
  private async waitAction(config: Record<string, unknown>): Promise<void> {
    const { duration } = config

    console.log(`      ⏱️  Wait action: ${duration} seconds`)
    // In production, this would schedule the next action in a queue
    // For now, we just log it
  }

  /**
   * Replace template variables with actual values
   * Supports: {{lead.name}}, {{lead.email}}, etc.
   */
  private replaceVariables(
    template: string | undefined,
    context: ExecutionContext
  ): string {
    if (!template) return ''

    let result = template

    // Replace lead variables
    if (context.lead) {
      result = result.replace(/\{\{lead\.(\w+)\}\}/g, (match, field) => {
        return context.lead[field] || match
      })
    }

    // Replace event data variables
    result = result.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      const value = (context.eventData as any)[field]
      return value !== undefined ? String(value) : match
    })

    return result
  }

  /**
   * Parse due date string
   * Supports: "+3 days", "+1 week", "2024-12-31"
   */
  private parseDueDate(dueDateStr: string): Date {
    const now = new Date()

    // Handle relative dates like "+3 days"
    const relativeMatch = dueDateStr.match(/^\+(\d+)\s*(day|days|week|weeks|hour|hours)$/i)
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10)
      const unit = relativeMatch[2].toLowerCase()

      const date = new Date(now)
      
      if (unit.startsWith('day')) {
        date.setDate(date.getDate() + amount)
      } else if (unit.startsWith('week')) {
        date.setDate(date.getDate() + amount * 7)
      } else if (unit.startsWith('hour')) {
        date.setHours(date.getHours() + amount)
      }

      return date
    }

    // Handle absolute dates
    return new Date(dueDateStr)
  }
}

// Export singleton instance
export const workflowExecutorService = new WorkflowExecutorService()
