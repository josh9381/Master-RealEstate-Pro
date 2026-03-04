/**
 * Backend MJML compilation utility.
 *
 * Converts email block JSON → MJML → final cross-client HTML.
 * Used when sending campaigns and for "Preview Final Email" API.
 */

import mjml2html from 'mjml'
import { blocksToMjml } from './emailBlocksShared.js'

export interface CompileResult {
  html: string
  errors: { message: string; line: number }[]
}

export interface CanSpamOptions {
  /** Unsubscribe URL with token — {{unsubscribeUrl}} will be kept for Handlebars replacement */
  unsubscribeUrl?: string
  /** Physical mailing address (required by CAN-SPAM) */
  physicalAddress?: string
  /** Company name */
  companyName?: string
  /** Skip CAN-SPAM footer (e.g., for preview mode) */
  skipFooter?: boolean
}

/**
 * Generate the CAN-SPAM compliant MJML footer section.
 */
function canSpamFooterMjml(options: CanSpamOptions): string {
  const unsubUrl = options.unsubscribeUrl || '{{unsubscribeUrl}}'
  const company = options.companyName || '{{company.name}}'
  const address = options.physicalAddress || '{{company.address}}'
  
  return `
<mj-section padding="16px 24px 24px 24px">
  <mj-column>
    <mj-divider border-color="#e5e5e5" border-width="1px" padding="0 0 16px 0" />
    <mj-text align="center" color="#9ca3af" font-size="12px" line-height="1.5" font-family="Arial, Helvetica, sans-serif" padding="0 0 8px 0">
      You are receiving this email because you opted in to communications from ${company}.
    </mj-text>
    <mj-text align="center" color="#9ca3af" font-size="12px" line-height="1.5" font-family="Arial, Helvetica, sans-serif" padding="0 0 8px 0">
      ${address}
    </mj-text>
    <mj-text align="center" color="#9ca3af" font-size="12px" line-height="1.5" font-family="Arial, Helvetica, sans-serif" padding="0">
      <a href="${unsubUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> &nbsp;|&nbsp; <a href="${unsubUrl}/preferences" style="color: #6b7280; text-decoration: underline;">Email Preferences</a>
    </mj-text>
  </mj-column>
</mj-section>`
}

/**
 * Inject CAN-SPAM footer into an MJML string before the closing </mj-body> tag.
 */
function injectCanSpamFooter(mjmlString: string, options: CanSpamOptions): string {
  if (options.skipFooter) return mjmlString
  const footer = canSpamFooterMjml(options)
  return mjmlString.replace('</mj-body>', `${footer}\n  </mj-body>`)
}

/**
 * Compile an MJML string to responsive HTML.
 */
export function compileMjml(mjmlString: string, canSpam?: CanSpamOptions): CompileResult {
  const finalMjml = canSpam ? injectCanSpamFooter(mjmlString, canSpam) : mjmlString
  const result = mjml2html(finalMjml, {
    validationLevel: 'soft',
    minify: false,
  })
  return {
    html: result.html,
    errors: result.errors?.map((e: any) => ({ message: e.message || String(e), line: e.line || 0 })) || [],
  }
}

/**
 * Compile email blocks JSON to final HTML.
 * This is the main function used by the campaign executor.
 */
export function compileEmailBlocks(blocksJson: string, options?: { brandColor?: string; backgroundColor?: string; canSpam?: CanSpamOptions }): CompileResult {
  let blocks: any[]
  try {
    const parsed = JSON.parse(blocksJson)
    if (parsed && parsed.__emailBlocks && Array.isArray(parsed.blocks)) {
      blocks = parsed.blocks
    } else if (Array.isArray(parsed)) {
      blocks = parsed
    } else {
      // Not block-based content — wrap plain text in a basic MJML template
      return compilePlainText(blocksJson, options?.canSpam)
    }
  } catch {
    // Plain text fallback
    return compilePlainText(blocksJson, options?.canSpam)
  }

  const mjmlString = blocksToMjml(blocks, options)
  return compileMjml(mjmlString, options?.canSpam)
}

/**
 * Wrap plain text content in a basic MJML email template.
 * Used for legacy campaigns that predate the block editor.
 */
export function compilePlainText(text: string, canSpam?: CanSpamOptions): CompileResult {
  // If it's already HTML (starts with < tag), wrap in minimal MJML
  const isHtml = text.trim().startsWith('<')
  const content = isHtml ? text : text.replace(/\n/g, '<br/>')

  const mjmlString = `<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Arial, Helvetica, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f5">
    <mj-section background-color="#ffffff" padding="24px">
      <mj-column>
        <mj-text font-size="16px" color="#333333" line-height="1.6">${content}</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`

  return compileMjml(mjmlString, canSpam)
}
