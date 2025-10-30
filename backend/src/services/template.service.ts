import { prisma } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';

/**
 * Available variable contexts for templates
 */
export interface VariableContext {
  lead?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    status?: string;
    score?: number;
    value?: number;
    source?: string;
  };
  user?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  system?: {
    currentDate?: string;
    currentTime?: string;
    currentYear?: number;
    unsubscribeLink?: string;
    companyName?: string;
    companyWebsite?: string;
  };
  custom?: Record<string, string | number>;
}

/**
 * Template Service
 * Handles variable replacement, validation, and usage tracking
 */
export class TemplateService {
  /**
   * Replace variables in template with actual values
   * Supports nested variables like {{lead.name}} or {{user.email}}
   */
  renderTemplate(template: string, context: VariableContext): string {
    if (!template) return '';

    let rendered = template;

    // Replace all {{variable}} patterns
    const variablePattern = /\{\{([^}]+)\}\}/g;
    
    rendered = rendered.replace(variablePattern, (match, variable) => {
      const trimmedVar = variable.trim();
      const value = this.resolveVariable(trimmedVar, context);
      
      // Return original placeholder if variable not found
      return value !== undefined && value !== null ? String(value) : match;
    });

    return rendered;
  }

  /**
   * Resolve a variable path to its actual value
   * Supports dot notation: lead.name, user.email, etc.
   */
  private resolveVariable(path: string, context: VariableContext): string | number | undefined {
    const parts = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = context;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Get available variables for a specific context
   */
  getAvailableVariables(contextType: 'lead' | 'campaign' | 'user' | 'all'): Record<string, string> {
    const variables: Record<string, string> = {};

    if (contextType === 'lead' || contextType === 'all') {
      variables['{{lead.name}}'] = 'Full name of the lead';
      variables['{{lead.firstName}}'] = 'First name of the lead';
      variables['{{lead.lastName}}'] = 'Last name of the lead';
      variables['{{lead.email}}'] = 'Email address';
      variables['{{lead.phone}}'] = 'Phone number';
      variables['{{lead.company}}'] = 'Company name';
      variables['{{lead.position}}'] = 'Job position/title';
      variables['{{lead.status}}'] = 'Lead status (NEW, CONTACTED, etc.)';
      variables['{{lead.score}}'] = 'Lead score (0-100)';
      variables['{{lead.value}}'] = 'Estimated value';
      variables['{{lead.source}}'] = 'Lead source';
    }

    if (contextType === 'user' || contextType === 'all') {
      variables['{{user.name}}'] = 'Your full name';
      variables['{{user.firstName}}'] = 'Your first name';
      variables['{{user.lastName}}'] = 'Your last name';
      variables['{{user.email}}'] = 'Your email address';
      variables['{{user.phone}}'] = 'Your phone number';
    }

    if (contextType === 'all') {
      variables['{{system.currentDate}}'] = 'Current date';
      variables['{{system.currentTime}}'] = 'Current time';
      variables['{{system.currentYear}}'] = 'Current year';
      variables['{{system.unsubscribeLink}}'] = 'Unsubscribe link';
      variables['{{system.companyName}}'] = 'Your company name';
      variables['{{system.companyWebsite}}'] = 'Your company website';
    }

    return variables;
  }

  /**
   * Validate that all variables in template can be resolved
   */
  validateTemplate(template: string, context: VariableContext): {
    isValid: boolean;
    missingVariables: string[];
    warnings: string[];
  } {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const missingVariables: string[] = [];
    const warnings: string[] = [];
    const matches = template.matchAll(variablePattern);

    for (const match of matches) {
      const variable = match[1].trim();
      const value = this.resolveVariable(variable, context);

      if (value === undefined || value === null) {
        missingVariables.push(variable);
      }
    }

    // Check for common issues
    if (template.includes('{{') && !template.includes('}}')) {
      warnings.push('Template contains incomplete variable syntax');
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      warnings,
    };
  }

  /**
   * Extract all variables from a template
   */
  extractVariables(template: string): string[] {
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    const matches = template.matchAll(variablePattern);

    for (const match of matches) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  /**
   * Increment usage count for an email template
   */
  async trackEmailTemplateUsage(templateId: string): Promise<void> {
    await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Increment usage count for an SMS template
   */
  async trackSMSTemplateUsage(templateId: string): Promise<void> {
    await prisma.sMSTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Get a rendered preview of an email template with sample data
   */
  async getEmailTemplatePreview(templateId: string): Promise<{
    subject: string;
    body: string;
    variables: Record<string, any>;
  }> {
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Email template not found');
    }

    // Create sample context
    const sampleContext: VariableContext = {
      lead: {
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        position: 'CEO',
        status: 'NEW',
        score: 75,
        value: 50000,
        source: 'website',
      },
      user: {
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        phone: '+1987654321',
      },
      system: {
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
        currentYear: new Date().getFullYear(),
        unsubscribeLink: 'https://example.com/unsubscribe',
        companyName: 'Your Company',
        companyWebsite: 'https://example.com',
      },
    };

    return {
      subject: this.renderTemplate(template.subject, sampleContext),
      body: this.renderTemplate(template.body, sampleContext),
      variables: this.extractVariables(`${template.subject} ${template.body}`) as unknown as Record<string, string>,
    };
  }

  /**
   * Get a rendered preview of an SMS template with sample data
   */
  async getSMSTemplatePreview(templateId: string): Promise<{
    body: string;
    variables: Record<string, any>;
    length: number;
    segments: number;
  }> {
    const template = await prisma.sMSTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('SMS template not found');
    }

    // Create sample context
    const sampleContext: VariableContext = {
      lead: {
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Acme Corp',
        position: 'CEO',
        status: 'NEW',
        score: 75,
      },
      user: {
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
      },
      system: {
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
      },
    };

    const renderedBody = this.renderTemplate(template.body, sampleContext);
    const length = renderedBody.length;
    const segments = Math.ceil(length / 160);

    return {
      body: renderedBody,
      variables: this.extractVariables(template.body) as unknown as Record<string, string>,
      length,
      segments,
    };
  }

  /**
   * Build system context with current date/time
   */
  buildSystemContext(additionalData?: {
    unsubscribeLink?: string;
    companyName?: string;
    companyWebsite?: string;
  }): VariableContext['system'] {
    const now = new Date();
    
    return {
      currentDate: now.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      currentTime: now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      }),
      currentYear: now.getFullYear(),
      unsubscribeLink: additionalData?.unsubscribeLink || '',
      companyName: additionalData?.companyName || '',
      companyWebsite: additionalData?.companyWebsite || '',
    };
  }

  /**
   * Parse user's full name into firstName and lastName
   */
  parseFullName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    
    return { firstName, lastName };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
