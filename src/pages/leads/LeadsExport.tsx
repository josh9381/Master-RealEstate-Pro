import { Download, FileSpreadsheet, FileJson, FileText, Calendar, Table } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { leadsApi, usersApi, exportApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LeadsSubNav } from '@/components/leads/LeadsSubNav';

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

const LeadsExport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [exportHistory, setExportHistory] = useState<Array<{id: number; name: string; format: string; records: number; date: string; blob?: Blob; filename?: string}>>([])
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    assignedTo: 'all',
    dateFrom: '',
    dateTo: '',
  })
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(ALL_FIELDS))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const { toast } = useToast();

  useEffect(() => {
    loadLeadCount();
    loadTeamMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLeadCount = async () => {
    try {
      const response = await leadsApi.getLeads({ limit: 1 });
      setTotalLeads(response.data?.pagination?.total || response.data?.total || 0);
    } catch (error) {
      console.error('Error loading lead count:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const members = await usersApi.getTeamMembers();
      setTeamMembers(Array.isArray(members) ? members : []);
    } catch { /* optional */ }
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleExport = async (format: string) => {
    setIsLoading(true);
    try {
      // Build query params from filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = { limit: 1000 };
      if (exportFilters.status !== 'all') params.status = exportFilters.status.toUpperCase();
      if (exportFilters.assignedTo !== 'all') params.assignedTo = exportFilters.assignedTo;
      if (exportFilters.dateFrom) params.dateFrom = exportFilters.dateFrom;
      if (exportFilters.dateTo) params.dateTo = exportFilters.dateTo;

      const response = await leadsApi.getLeads(params);
      const leads = response.data?.leads || [];

      // Filter by date client-side as well in case backend doesn't support these filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredLeads = leads.filter((lead: any) => {
        if (exportFilters.dateFrom && lead.createdAt && new Date(lead.createdAt) < new Date(exportFilters.dateFrom)) return false;
        if (exportFilters.dateTo && lead.createdAt && new Date(lead.createdAt) > new Date(exportFilters.dateTo + 'T23:59:59')) return false;
        return true;
      });
      
      let exportData: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        exportData = JSON.stringify(filteredLeads, null, 2);
        filename = `leads_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // CSV (and Excel fallback)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buildRow = (lead: any): string[] => {
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
      const bom = (format === 'excel') ? '\uFEFF' : '';
      const blob = new Blob([bom + exportData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredLeads.length} leads as ${format.toUpperCase()}`);
      
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
      console.error('Error exporting leads:', error);
      toast.error('Failed to export leads');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      <div>
        <h1 className="text-3xl font-bold">Export Leads</h1>
        <p className="text-muted-foreground mt-2">Download your lead data in various formats</p>
      </div>

      {/* Export Options */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2 border-green-200">
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Table className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Excel (.xlsx)</CardTitle>
            </div>
            <CardDescription>
              Server-side Excel export with formatting, filters, and frozen headers. Best for large datasets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={async () => {
              setIsLoading(true);
              try {
                const filters: any = {};
                if (exportFilters.status !== 'all') filters.status = exportFilters.status;
                if (exportFilters.assignedTo !== 'all') filters.assignedTo = exportFilters.assignedTo;
                if (exportFilters.dateFrom) filters.dateFrom = exportFilters.dateFrom;
                if (exportFilters.dateTo) filters.dateTo = exportFilters.dateTo;
                await exportApi.download('leads', 'xlsx', filters);
                toast.success('Excel export downloaded successfully');
              } catch (error) {
                console.error('Error exporting:', error);
                toast.error('Failed to export as Excel');
              } finally {
                setIsLoading(false);
              }
            }} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export as Excel
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Spreadsheet (CSV)</CardTitle>
            </div>
            <CardDescription>
              Export as CSV compatible with Excel, Google Sheets, and other spreadsheet apps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('excel')} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export for Excel (CSV)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>CSV</CardTitle>
            </div>
            <CardDescription>Simple comma-separated values for easy import</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('csv')} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileJson className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>JSON</CardTitle>
            </div>
            <CardDescription>Structured data for developers and integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => handleExport('json')} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Export Filters</CardTitle>
          <CardDescription>Customize what data to include in your export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Lead Status</label>
              <select 
                className="w-full p-2 border rounded-md"
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
              <label className="text-sm font-medium mb-2 block">Assigned To</label>
              <select 
                className="w-full p-2 border rounded-md"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-md"
                value={exportFilters.dateFrom}
                onChange={(e) => setExportFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <input 
                type="date" 
                className="w-full p-2 border rounded-md"
                value={exportFilters.dateTo}
                onChange={(e) => setExportFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Fields to Include</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_FIELDS.map((field) => (
                <label key={field} className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedFields.has(field)} 
                    onChange={() => toggleField(field)}
                    className="rounded" 
                  />
                  <span className="text-sm">{field}</span>
                </label>
              ))}
            </div>
          </div>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No exports yet. Use the export buttons above to download your leads.
            </p>
          ) : (
          <div className="space-y-3">
            {exportHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>{item.format}</span>
                      <span>{item.records} records</span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {item.date}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (item.blob && item.filename) {
                      const url = window.URL.createObjectURL(item.blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = item.filename;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    } else {
                      toast.info('Re-export to download again')
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export</CardTitle>
          <CardDescription>Export all leads with default settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <h4 className="font-semibold mb-1">Export All Leads</h4>
              <p className="text-sm text-muted-foreground">
                Download all {totalLeads.toLocaleString()} leads as CSV with all fields
              </p>
            </div>
            <Button onClick={() => handleExport('csv')} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Quick Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsExport;
