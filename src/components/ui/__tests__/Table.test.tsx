import { render, screen } from '@testing-library/react'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '../Table'

describe('Table', () => {
  it('renders a table element', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('renders table with all sections', () => {
    render(
      <Table>
        <TableCaption>My Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Row 1</TableCell>
            <TableCell>100</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>100</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Row 1')).toBeInTheDocument()
    expect(screen.getByText('My Table')).toBeInTheDocument()
  })

  it('renders column headers as th elements', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody />
      </Table>
    )
    const header = screen.getByText('Header')
    expect(header.tagName).toBe('TH')
  })

  it('renders cells as td elements', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Data</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    const cell = screen.getByText('Data')
    expect(cell.tagName).toBe('TD')
  })

  it('forwards ref on Table', () => {
    const ref = { current: null }
    render(
      <Table ref={ref}>
        <TableBody />
      </Table>
    )
    expect(ref.current).not.toBeNull()
  })

  it('applies custom className to Table', () => {
    render(
      <Table className="custom-table">
        <TableBody />
      </Table>
    )
    expect(screen.getByRole('table')).toHaveClass('custom-table')
  })
})
