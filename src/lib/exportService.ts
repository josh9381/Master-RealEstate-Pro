/**
 * Shared Export Service
 * 
 * Generates CSV/JSON exports from any data array with configurable column mapping.
 * Used across Analytics, Communications, Campaigns, Workflows, and Leads pages.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExportColumn<T = Record<string, any>> {
  header: string
  accessor: keyof T | ((row: T) => string | number | boolean | null | undefined)
}

interface ExportOptions {
  filename: string
  format?: 'csv' | 'json'
  /** Add UTF-8 BOM for Excel compatibility */
  excelCompatible?: boolean
}

/**
 * Escape a value for CSV output
 */
function csvEscape(val: string | number | boolean | null | undefined): string {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Get value from a row using an accessor (key or function)
 */
function getValue<T>(row: T, accessor: ExportColumn<T>['accessor']): string | number | boolean | null | undefined {
  if (typeof accessor === 'function') {
    return accessor(row)
  }
  return row[accessor] as string | number | boolean | null | undefined
}

/**
 * Export data as CSV and trigger download
 */
export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const { filename, excelCompatible = true } = options

  const headers = columns.map((col) => csvEscape(col.header))
  const rows = data.map((row) =>
    columns.map((col) => csvEscape(getValue(row, col.accessor)))
  )

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  // Add UTF-8 BOM for Excel compatibility
  const bom = excelCompatible ? '\uFEFF' : ''
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  downloadBlob(blob, `${filename}.csv`)
}

/**
 * Export data as JSON and trigger download
 */
export function exportToJSON<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const { filename } = options

  // Map data to use column headers as keys
  const mapped = data.map((row) => {
    const obj: Record<string, any> = {}
    columns.forEach((col) => {
      obj[col.header] = getValue(row, col.accessor)
    })
    return obj
  })

  const jsonContent = JSON.stringify(mapped, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })

  downloadBlob(blob, `${filename}.json`)
}

/**
 * Universal export function — dispatches to CSV or JSON based on format
 */
export function exportData<T>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  const format = options.format || 'csv'
  if (format === 'json') {
    exportToJSON(data, columns, options)
  } else {
    exportToCSV(data, columns, options)
  }
}

/**
 * Trigger a file download from a Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * Export the current page (or a specific DOM element) as a real PDF file using
 * html2canvas + jsPDF.  Falls back to window.print() if the libraries fail.
 *
 * @param title    – PDF document title & filename (without .pdf)
 * @param element  – optional DOM element to capture; defaults to document.body
 */
export async function printToPDF(
  title?: string,
  element?: HTMLElement
): Promise<void> {
  const target = element ?? document.body
  const filename = `${(title ?? 'report').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`

  try {
    const [html2canvasMod, jsPDFMod] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const html2canvas = html2canvasMod.default
    const { jsPDF } = jsPDFMod

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const imgData = canvas.toDataURL('image/png')

    const pdfWidth = 210 // A4 mm
    const pdfHeight = 297
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    // Multi-page support
    while (position < imgHeight) {
      if (position > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight)
      position += pdfHeight
    }

    pdf.save(filename)
  } catch {
    // Fallback to browser print dialog
    const originalTitle = document.title
    if (title) document.title = title
    window.print()
    if (title) document.title = originalTitle
  }
}

/**
 * Export analytics data as a formatted PDF.
 * Builds an off-screen HTML table, renders it with html2canvas, then saves via jsPDF.
 */
export async function exportAnalyticsAsPDF(
  reportTitle: string,
  sections: { label: string; value: string | number }[]
): Promise<void> {
  const filename = `${reportTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`

  try {
    const [html2canvasMod, jsPDFMod] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const html2canvas = html2canvasMod.default
    const { jsPDF } = jsPDFMod

    // Build an off-screen container
    const container = document.createElement('div')
    container.style.cssText =
      'position:fixed;top:-9999px;left:0;width:800px;padding:40px;font-family:system-ui,sans-serif;color:#111;background:#fff'

    const rows = sections
      .map(
        (s) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:500">${s.label}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${s.value}</td></tr>`
      )
      .join('')

    container.innerHTML = `
      <h1 style="font-size:24px;margin-bottom:4px">${reportTitle}</h1>
      <div style="color:#6b7280;font-size:14px;margin-bottom:24px">Generated ${new Date().toLocaleString()}</div>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    `

    document.body.appendChild(container)

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    document.body.removeChild(container)

    const imgData = canvas.toDataURL('image/png')
    const pdfWidth = 210
    const pdfHeight = 297
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    const pdf = new jsPDF('p', 'mm', 'a4')
    let position = 0

    while (position < imgHeight) {
      if (position > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight)
      position += pdfHeight
    }

    pdf.save(filename)
  } catch {
    // Fallback: open in new window with print dialog
    const win = window.open('', '_blank')
    if (!win) return

    const rows = sections
      .map(
        (s) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:500">${s.label}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${s.value}</td></tr>`
      )
      .join('')

    win.document.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title><style>
      body{font-family:system-ui,sans-serif;padding:40px;color:#111}
      h1{font-size:24px;margin-bottom:4px}
      .meta{color:#6b7280;font-size:14px;margin-bottom:24px}
      table{width:100%;border-collapse:collapse}
      @media print{body{padding:20px}}
    </style></head><body>
      <h1>${reportTitle}</h1>
      <div class="meta">Generated ${new Date().toLocaleString()}</div>
      <table>${rows}</table>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
    win.document.close()
  }
}

// ============================================================================
// Pre-built column configs for common exports
// ============================================================================

export const campaignExportColumns: ExportColumn[] = [
  { header: 'Name', accessor: 'name' },
  { header: 'Type', accessor: 'type' },
  { header: 'Status', accessor: 'status' },
  { header: 'Sent', accessor: (r: Record<string, any>) => r.sent || 0 },
  { header: 'Delivered', accessor: (r: Record<string, any>) => r.delivered || 0 },
  { header: 'Opened', accessor: (r: Record<string, any>) => r.opened || 0 },
  { header: 'Clicked', accessor: (r: Record<string, any>) => r.clicked || 0 },
  { header: 'Converted', accessor: (r: Record<string, any>) => r.converted || 0 },
  { header: 'Revenue', accessor: (r: Record<string, any>) => r.revenue || 0 },
  { header: 'ROI', accessor: (r: Record<string, any>) => r.roi || 0 },
  { header: 'Budget', accessor: (r: Record<string, any>) => r.budget || 0 },
  { header: 'Spent', accessor: (r: Record<string, any>) => r.spent || 0 },
]

export const leadExportColumns: ExportColumn[] = [
  { header: 'Name', accessor: (r: Record<string, any>) => `${r.firstName} ${r.lastName}` },
  { header: 'Email', accessor: 'email' },
  { header: 'Company', accessor: 'company' },
  { header: 'Phone', accessor: 'phone' },
  { header: 'Score', accessor: (r: Record<string, any>) => r.score || 0 },
  { header: 'Status', accessor: 'status' },
  { header: 'Source', accessor: 'source' },
  { header: 'Value', accessor: (r: Record<string, any>) => r.value || 0 },
  { header: 'Assigned To', accessor: (r: Record<string, any>) => r.assignedTo || 'Unassigned' },
  { header: 'Tags', accessor: (r: Record<string, any>) => (r.tags || []).join('; ') },
]

export const activityExportColumns: ExportColumn[] = [
  { header: 'Date', accessor: (r: Record<string, any>) => new Date(r.createdAt).toLocaleString() },
  { header: 'Type', accessor: 'type' },
  { header: 'Title', accessor: 'title' },
  { header: 'Description', accessor: 'description' },
  { header: 'User', accessor: (r: Record<string, any>) => r.user ? `${r.user.firstName} ${r.user.lastName}` : '' },
  { header: 'Lead', accessor: (r: Record<string, any>) => r.lead ? `${r.lead.firstName} ${r.lead.lastName}` : '' },
]

export const workflowExportColumns: ExportColumn[] = [
  { header: 'Name', accessor: 'name' },
  { header: 'Status', accessor: (r: Record<string, any>) => r.isActive ? 'Active' : 'Inactive' },
  { header: 'Trigger', accessor: (r: Record<string, any>) => r.trigger?.type || '' },
  { header: 'Actions', accessor: (r: Record<string, any>) => r.actions?.length || 0 },
  { header: 'Created', accessor: (r: Record<string, any>) => new Date(r.createdAt).toLocaleDateString() },
]

export const messageExportColumns: ExportColumn[] = [
  { header: 'Date', accessor: (r: Record<string, any>) => new Date(r.createdAt).toLocaleString() },
  { header: 'Type', accessor: 'type' },
  { header: 'Direction', accessor: 'direction' },
  { header: 'From', accessor: 'fromAddress' },
  { header: 'To', accessor: 'toAddress' },
  { header: 'Subject', accessor: 'subject' },
  { header: 'Status', accessor: 'status' },
]
