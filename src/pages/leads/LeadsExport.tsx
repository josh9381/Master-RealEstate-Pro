import { logger } from '@/lib/logger'
import { Download, FileSpreadsheet, FileJson, FileText, Calendar, ShieldAlert, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadsApi, usersApi, exportApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';
import { useAuthStore } from '@/store/authStore';
import type { Lead, TeamMember } from '@/types';

const selectClasses = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const checkboxClasses = 'h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background';

const FORMAT_OPTIONS = [
  { value: 'xlsx' as const, label: 'Excel (.xlsx)', desc: 'Best for spreadsheets', icon: FileSpreadsheet },
  { value: 'csv' as const, label: 'CSV (.csv)', desc: 'Universal compatibility', icon: FileText },
  { value: 'json' as const, label: 'JSON (.json)', desc: 'For developers & integrations', icon: FileJson },
];

const ALL_FIELDS = [
  'Name', 'Email', 'Phone', 'Company', 'Status', 'Source',
  'Score', 'Tags', 'Created Date', 'Last Contact', 'Notes', 'Custom Fields',
] as const;

function escapeCsvField(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const FIELD_TO_KEY: Record<string, string> = {
  'Name': 'firstName',
  'Email': 'email',
  'Phone': 'phone',
  'Company': 'company',
  'Status': 'status',
  'Source': 'source',
  'Score': 'score',
  'Tags': 'tags',
  'Created Date': 'createdAt',
  'Last Contact': 'lastContactedAt',
  'Notes': 'notes',
  'Custom Fields': 'customFields',
};

const LeadsExport = () => {
  const canExport = useAuthStore((s) => s.hasPermission('canExportData'));
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<Array<{id: number; name: string; format: string; records: number; date: string; blob?: Blob; filename?: string}>>([])
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    assignedTo: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELDS))
  const { toast } = useToast();
  const showConfirm = useConfirm();

  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  const { data: totalLeads = 0 } = useQuery({
    queryKey: ['leads', 'count'],
    queryFn: async () => {
      const response = await leadsApi.getLeads({ limit: 1 });
      return response.data?.pagination?.total || response.data?.total || 0;
    },
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: async () => {
      const members = await usersApi.getTeamMembers();
      return Array.isArray(members) ? members : [];
    },
  });

  const toggleField = (field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleExport = async (format: string) => {
    // Validate date range
    if (exportFilters.dateFrom && exportFilters.dateTo && exportFilters.dateFrom > exportFilters.dateTo) {
      toast.error('"Date From" must be before "Date To"');
      return;
    }

    // Warn about export cap if total leads exceed limit
    const EXPORT_LIMIT = 1000;
    if (totalLeads > EXPORT_LIMIT) {
      const confirmed = await showConfirm({
        title: 'Export Limit',
        message: `Your export will be capped at ${EXPORT_LIMIT.toLocaleString()} records out of ${totalLeads.toLocaleString()} total leads. Narrow your filters to export specific subsets. Continue?`,
        confirmLabel: 'Export Anyway',
      });
      if (!confirmed) return;
    }

    setIsExporting(true);
    try {
      // Build query params from filters
      const params: Record<string, string | number> = { limit: EXPORT_LIMIT };
      if (exportFilters.status !== 'all') params.status = exportFilters.status.toUpperCase();
      if (exportFilters.assignedTo !== 'all') params.assignedTo = exportFilters.assignedTo;
      if (exportFilters.dateFrom) params.dateFrom = exportFilters.dateFrom;
      if (exportFilters.dateTo) params.dateTo = exportFilters.dateTo;

      const response = await leadsApi.getLeads(params);
      const leads = response.data?.leads || [];

      // Filter by date client-side as well in case backend doesn't support these filters
      const filteredLeads = leads.filter((lead: Lead) => {
        if (exportFilters.dateFrom && lead.createdAt && new Date(lead.createdAt) < new Date(exportFilters.dateFrom)) return false;
        if (exportFilters.dateTo && lead.createdAt && new Date(lead.createdAt) > new Date(exportFilters.dateTo + 'T23:59:59')) return false;
        return true;
      });
      
      let exportData: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        // Apply field selection to JSON export
        const fieldMap: Record<string, (lead: Lead) => unknown> = {
          'Name': (l) => `${l.firstName || ''} ${l.lastName || ''}`.trim(),
          'Email': (l) => l.email,
          'Phone': (l) => l.phone,
          'Company': (l) => l.company,
          'Status': (l) => l.status,
          'Source': (l) => l.source,
          'Score': (l) => l.score,
          'Tags': (l) => (l.tags || []).map((t: string | {name: string}) => typeof t === 'string' ? t : t.name),
          'Created Date': (l) => l.createdAt,
          'Last Contact': (l) => l.lastContact,
          'Notes': (l) => typeof l.notes === 'string' ? l.notes : '',
          'Custom Fields': (l) => l.customFields || {},
        }
        const filteredData = filteredLeads.map((lead: Lead) => {
          const obj: Record<string, unknown> = {}
          for (const field of Array.from(selectedFields)) {
            if (fieldMap[field]) obj[field] = fieldMap[field](lead)
          }
          return obj
        })
        exportData = JSON.stringify(filteredData, null, 2);
        filename = `leads_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // CSV (and Excel fallback)
        const buildRow = (lead: Lead): string[] => {
          const row: string[] = [];
          if (selectedFields.has('Name')) row.push(escapeCsvField(`${lead.firstName || ''} ${lead.lastName || ''}`.trim()));
          if (selectedFields.has('Email')) row.push(escapeCsvField(lead.email));
          if (selectedFields.has('Phone')) row.push(escapeCsvField(lead.phone));
          if (selectedFields.has('Company')) row.push(escapeCsvField(lead.company));
          if (selectedFields.has('Status')) row.push(escapeCsvField(lead.status));
          if (selectedFields.has('Source')) row.push(escapeCsvField(lead.source));
          if (selectedFields.has('Score')) row.push(escapeCsvField(lead.score));
          if (selectedFields.has('Tags')) row.push(escapeCsvField((lead.tags || []).map((t: string | {name: string}) => typeof t === 'string' ? t : t.name).join('; ')));
          if (selectedFields.has('Created Date')) row.push(escapeCsvField(lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''));
          if (selectedFields.has('Last Contact')) row.push(escapeCsvField(lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : ''));
          if (selectedFields.has('Notes')) row.push(escapeCsvField(typeof lead.notes === 'string' ? lead.notes : ''));
          if (selectedFields.has('Custom Fields')) row.push(escapeCsvField(lead.customFields ? JSON.stringify(lead.customFields) : ''));
          return row;
        };

        const headers = Array.from(ALL_FIELDS).filter(f => selectedFields.has(f));
        const rows = filteredLeads.map(buildRow);
        exportData = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
        filename = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Add UTF-8 BOM for Excel compatibility
      const bom = (format === 'csv') ? '\uFEFF' : '';
      const blob = new Blob([bom + exportData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (filteredLeads.length >= EXPORT_LIMIT && totalLeads > EXPORT_LIMIT) {
        toast.warning(`Export capped at ${EXPORT_LIMIT} leads. You have ${totalLeads} total leads matching these filters. Narrow your filters to export all data.`);
      } else {
        toast.success(`Exported ${filteredLeads.length} leads as ${format.toUpperCase()}`);
      }
      
      // Save blob for re-download (not revoked URL)
      setExportHistory(prev => [{
        id: Date.now(),
        name: `Leads Export - ${new Date().toLocaleDateString()}`,
        format: format.toUpperCase(),
        records: filteredLeads.length,
        date: new Date().toISOString().split('T')[0],
        blob,
        filename,
      }, ...prev].slice(0, 10));
    } catch (error) {
      logger.error('Error exporting leads:', error);
      toast.error('Failed to export leads');
    } finally {
      setIsExporting(false);
    }
  };

  // Build active filter summary chips
  const activeFilters: string[] = [];
  if (exportFilters.status !== 'all') activeFilters.push(`Status: ${exportFilters.status}`);
  if (exportFilters.assignedTo !== 'all') {
    const member = teamMembers.find((m: TeamMember) => m.id === exportFilters.assignedTo);
    activeFilters.push(`Assigned: ${member?.name || member?.firstName || 'Selected'}`);
  }
  if (exportFilters.dateFrom) activeFilters.push(`From: ${exportFilters.dateFrom}`);
  if (exportFilters.dateTo) activeFilters.push(`To: ${exportFilters.dateTo}`);
  if (selectedFields.size < ALL_FIELDS.length) activeFilters.push(`${selectedFields.size}/${ALL_FIELDS.length} fields`);

  const handleMainExport = async () => {
    // Validate date range
    if (exportFilters.dateFrom && exportFilters.dateTo && exportFilters.dateFrom > exportFilters.dateTo) {
      toast.error('"Date From" must be before "Date To"');
      return;
    }

    if (exportFormat === 'xlsx') {
      setIsExporting(true);
      try {
        const filters: Record<string, string | string[]> = {};
        if (exportFilters.status !== 'all') filters.status = exportFilters.status;
        if (exportFilters.assignedTo !== 'all') filters.assignedTo = exportFilters.assignedTo;
        if (exportFilters.dateFrom) filters.dateFrom = exportFilters.dateFrom;
        if (exportFilters.dateTo) filters.dateTo = exportFilters.dateTo;
        if (selectedFields.size < ALL_FIELDS.length) {
          filters.fields = Array.from(selectedFields).map(f => FIELD_TO_KEY[f]).filter(Boolean);
        }
        await exportApi.download('leads', 'xlsx', filters as Record<string, string | string[]>);
        toast.success('Excel export downloaded successfully');
        setExportHistory(prev => [{
          id: Date.now(),
          name: `Leads Export - ${new Date().toLocaleDateString()}`,
          format: 'XLSX',
          records: totalLeads,
          date: new Date().toISOString().split('T')[0],
        }, ...prev].slice(0, 10));
      } catch (error) {
        logger.error('Error exporting:', error);
        toast.error('Failed to export as Excel');
      } finally {
        setIsExporting(false);
      }
    } else {
      handleExport(exportFormat);
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold">Export Leads</h1>
        <p className="text-muted-foreground mt-2">
          Download your lead data in various formats.{totalLeads > 0 && ` ${totalLeads} total leads available.`}
        </p>
      </div>

      {!canExport && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">You don't have permission to export data. Contact your administrator to enable export access.</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Format */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Choose Format
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FORMAT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = exportFormat === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 bg-background hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={opt.value}
                    checked={isSelected}
                    onChange={() => setExportFormat(opt.value)}
                    className="sr-only"
                  />
                  <Icon className={`h-5 w-5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {/* Quick Export shortcut */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Quick Export:</span> Skip filters and export all leads as CSV immediately
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 w-full sm:w-auto"
              loading={isExporting}
              onClick={() => handleExport('csv')}
              disabled={isExporting || !canExport}
            >
              <Download className="h-4 w-4" />
              Quick CSV Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Filters & Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Filters &amp; Fields
          </CardTitle>
          <CardDescription>Customize what data to include in your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="export-status" className="text-sm font-medium mb-2 block">Lead Status</label>
              <select
                id="export-status"
                className={selectClasses}
                value={exportFilters.status}
                onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label htmlFor="export-assigned" className="text-sm font-medium mb-2 block">Assigned To</label>
              <select
                id="export-assigned"
                className={selectClasses}
                value={exportFilters.assignedTo}
                onChange={(e) => setExportFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              >
                <option value="all">All Team Members</option>
                {teamMembers.map((member: { id: string; name?: string; firstName?: string; lastName?: string }) => (
                  <option key={member.id} value={member.id}>
                    {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="export-date-from" className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                id="export-date-from"
                type="date"
                value={exportFilters.dateFrom}
                onChange={(e) => setExportFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="export-date-to" className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                id="export-date-to"
                type="date"
                value={exportFilters.dateTo}
                onChange={(e) => setExportFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Fields to Include</label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  if (selectedFields.size === ALL_FIELDS.length) {
                    setSelectedFields(new Set());
                  } else {
                    setSelectedFields(new Set(ALL_FIELDS));
                  }
                }}
              >
                {selectedFields.size === ALL_FIELDS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_FIELDS.map((field) => (
                <label key={field} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => toggleField(field)}
                    className={checkboxClasses}
                  />
                  <span className="text-sm">{field}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Export Action (bottom — after config) */}
      <Card className={!canExport ? 'opacity-60 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active filter summary */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Exporting:</span>
            <span className="font-medium">{totalLeads.toLocaleString()} leads</span>
            <span className="text-muted-foreground">as</span>
            <span className="font-medium">{exportFormat.toUpperCase()}</span>
            {activeFilters.length > 0 && (
              <>
                <span className="text-muted-foreground">with</span>
                {activeFilters.map((f, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {f}
                  </span>
                ))}
              </>
            )}
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto"
            loading={isExporting}
            onClick={handleMainExport}
            disabled={isExporting || !canExport || selectedFields.size === 0}
            aria-label={`Export leads as ${exportFormat.toUpperCase()}`}
          >
            <Download className="h-4 w-4" />
            Export {totalLeads.toLocaleString()} Leads as {exportFormat.toUpperCase()}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>Your previous exports and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          {exportHistory.length === 0 ? (
            <div className="text-center py-8">
              <Download className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No exports yet. Use the export button above to download your leads.
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {exportHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg gap-4"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    {item.format === 'XLSX' ? (
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                    ) : item.format === 'JSON' ? (
                      <FileJson className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium truncate">{item.name}</h4>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span>{item.format}</span>
                      <span>{item.records} records</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>
                {item.blob && item.filename ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      const url = window.URL.createObjectURL(item.blob!);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = item.filename!;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => handleMainExport()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-export
                  </Button>
                )}
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsExport;
