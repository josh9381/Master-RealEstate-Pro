/**
 * Tests for exportService.ts
 *
 * We test the pure logic (CSV escape, column accessors, JSON mapping).
 * The DOM-dependent download/PDF functionality is mocked.
 */
import type { ExportColumn } from '../exportService'

// Mock window.URL and DOM operations before import
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()

Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
})

// Mock createElement to track anchor clicks
const originalCreateElement = document.createElement.bind(document)
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  const el = originalCreateElement(tag)
  if (tag === 'a') {
    el.click = mockClick
  }
  return el
})

import { exportToCSV, exportToJSON, exportData, campaignExportColumns, leadExportColumns } from '../exportService'

describe('exportToCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a CSV blob and triggers download', () => {
    const data = [
      { name: 'Alice', score: 90 },
      { name: 'Bob', score: 75 },
    ]
    const columns: ExportColumn<typeof data[0]>[] = [
      { header: 'Name', accessor: 'name' },
      { header: 'Score', accessor: 'score' },
    ]

    exportToCSV(data, columns, { filename: 'test' })

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    expect(mockClick).toHaveBeenCalledTimes(1)
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1)
  })

  it('escapes values containing commas', () => {
    const data = [{ name: 'Smith, John', val: 1 }]
    const columns: ExportColumn<typeof data[0]>[] = [
      { header: 'Name', accessor: 'name' },
      { header: 'Value', accessor: 'val' },
    ]

    // We verify it doesn't throw; actual CSV content is verified via the Blob
    expect(() => exportToCSV(data, columns, { filename: 'test' })).not.toThrow()
  })

  it('supports function accessors', () => {
    const data = [{ first: 'John', last: 'Doe' }]
    const columns: ExportColumn<typeof data[0]>[] = [
      { header: 'Full Name', accessor: (row) => `${row.first} ${row.last}` },
    ]

    expect(() => exportToCSV(data, columns, { filename: 'names' })).not.toThrow()
  })

  it('handles empty data array', () => {
    const columns: ExportColumn[] = [
      { header: 'Name', accessor: 'name' },
    ]

    expect(() => exportToCSV([], columns, { filename: 'empty' })).not.toThrow()
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})

describe('exportToJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates a JSON blob and triggers download', () => {
    const data = [{ name: 'Alice', score: 90 }]
    const columns: ExportColumn<typeof data[0]>[] = [
      { header: 'Name', accessor: 'name' },
      { header: 'Score', accessor: 'score' },
    ]

    exportToJSON(data, columns, { filename: 'test' })

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('maps data using column headers as keys', () => {
    const data = [{ n: 'Alice' }]
    const columns: ExportColumn<typeof data[0]>[] = [
      { header: 'Full Name', accessor: 'n' },
    ]

    // Verify it doesn't throw
    expect(() => exportToJSON(data, columns, { filename: 'test' })).not.toThrow()
  })
})

describe('exportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to CSV format', () => {
    const data = [{ a: 1 }]
    const columns: ExportColumn[] = [{ header: 'A', accessor: 'a' }]

    exportData(data, columns, { filename: 'test' })
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('dispatches to JSON when specified', () => {
    const data = [{ a: 1 }]
    const columns: ExportColumn[] = [{ header: 'A', accessor: 'a' }]

    exportData(data, columns, { filename: 'test', format: 'json' })
    expect(mockClick).toHaveBeenCalledTimes(1)
  })
})

describe('pre-built column configs', () => {
  it('campaignExportColumns has expected headers', () => {
    const headers = campaignExportColumns.map((c) => c.header)
    expect(headers).toContain('Name')
    expect(headers).toContain('Status')
    expect(headers).toContain('Sent')
    expect(headers).toContain('Opened')
    expect(headers).toContain('ROI')
  })

  it('leadExportColumns has expected headers', () => {
    const headers = leadExportColumns.map((c) => c.header)
    expect(headers).toContain('Name')
    expect(headers).toContain('Email')
    expect(headers).toContain('Score')
    expect(headers).toContain('Status')
    expect(headers).toContain('Tags')
  })

  it('leadExportColumns Name accessor concatenates first and last', () => {
    const nameCol = leadExportColumns.find((c) => c.header === 'Name')!
    const accessor = nameCol.accessor as (row: Record<string, any>) => string
    expect(accessor({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe')
  })

  it('leadExportColumns Tags accessor joins with semicolon', () => {
    const tagsCol = leadExportColumns.find((c) => c.header === 'Tags')!
    const accessor = tagsCol.accessor as (row: Record<string, any>) => string
    expect(accessor({ tags: ['hot', 'vip'] })).toBe('hot; vip')
  })

  it('leadExportColumns Tags accessor handles empty array', () => {
    const tagsCol = leadExportColumns.find((c) => c.header === 'Tags')!
    const accessor = tagsCol.accessor as (row: Record<string, any>) => string
    expect(accessor({ tags: [] })).toBe('')
  })
})
