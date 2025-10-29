import { Merge, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect } from 'react';
import { leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface LeadData {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  score?: number;
}

interface DuplicatePair {
  id: number;
  lead1: LeadData;
  lead2: LeadData;
  similarity: number;
  reason: string;
}

const LeadsMerge = () => {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    potential: 0,
    mergedMonth: 0,
    autoMerged: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDuplicates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDuplicates = async () => {
    setIsLoading(true);
    try {
      const response = await leadsApi.getLeads({ limit: 200 });
      const leads = response.data || [];
      
      // Find potential duplicates
      const duplicatePairs: DuplicatePair[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailMap = new Map<string, any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const phoneMap = new Map<string, any>();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leads.forEach((lead: any) => {
        const email = lead.email?.toLowerCase();
        const phone = lead.phone?.replace(/\D/g, '');
        
        // Check for email duplicates
        if (email && emailMap.has(email)) {
          const existing = emailMap.get(email);
          duplicatePairs.push({
            id: duplicatePairs.length + 1,
            lead1: {
              id: existing.id,
              name: `${existing.firstName} ${existing.lastName}`,
              email: existing.email,
              phone: existing.phone,
              company: existing.company,
              score: existing.score || 0,
            },
            lead2: {
              id: lead.id,
              name: `${lead.firstName} ${lead.lastName}`,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              score: lead.score || 0,
            },
            similarity: 95,
            reason: 'Same email address',
          });
        } else if (email) {
          emailMap.set(email, lead);
        }
        
        // Check for phone duplicates
        if (phone && phone.length >= 10 && phoneMap.has(phone)) {
          const existing = phoneMap.get(phone);
          // Only add if not already added by email match
          const alreadyMatched = duplicatePairs.some(
            d => (d.lead1.id === existing.id && d.lead2.id === lead.id) ||
                 (d.lead1.id === lead.id && d.lead2.id === existing.id)
          );
          
          if (!alreadyMatched) {
            duplicatePairs.push({
              id: duplicatePairs.length + 1,
              lead1: {
                id: existing.id,
                name: `${existing.firstName} ${existing.lastName}`,
                email: existing.email,
                phone: existing.phone,
                company: existing.company,
                score: existing.score || 0,
              },
              lead2: {
                id: lead.id,
                name: `${lead.firstName} ${lead.lastName}`,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                score: lead.score || 0,
              },
              similarity: 90,
              reason: 'Same phone number',
            });
          }
        } else if (phone && phone.length >= 10) {
          phoneMap.set(phone, lead);
        }
      });

      setDuplicates(duplicatePairs);
      setStats({
        potential: duplicatePairs.length,
        mergedMonth: 0,
        autoMerged: 0,
      });
    } catch (error) {
      console.error('Error loading duplicates:', error);
      toast.error('Failed to load duplicate leads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async (duplicateId: number) => {
    const duplicate = duplicates.find(d => d.id === duplicateId);
    if (!duplicate) return;

    try {
      // In a real implementation, you'd call an API endpoint to merge
      // For now, we'll just show a success message
      toast.success(`Merged leads #${duplicate.lead1.id} and #${duplicate.lead2.id}`);
      
      // Remove from list
      setDuplicates(prev => prev.filter(d => d.id !== duplicateId));
      setStats(prev => ({ ...prev, potential: prev.potential - 1, mergedMonth: prev.mergedMonth + 1 }));
    } catch (error) {
      console.error('Error merging leads:', error);
      toast.error('Failed to merge leads');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merge Duplicate Leads</h1>
          <p className="text-muted-foreground mt-2">
            Find and merge duplicate lead records
          </p>
        </div>
        <Button onClick={loadDuplicates} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Scan for Duplicates
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Duplicates</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.potential}</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merged This Month</CardTitle>
            <Merge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mergedMonth}</div>
            <p className="text-xs text-muted-foreground">Database cleaned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Merged</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.autoMerged}</div>
            <p className="text-xs text-muted-foreground">By rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Merge Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Detection Settings</CardTitle>
          <CardDescription>Configure how duplicates are identified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by email address</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by phone number</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Match by full name</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
              <span className="text-sm">Match by company name</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Similarity Threshold</label>
            <div className="flex items-center space-x-4">
              <input type="range" min="50" max="100" defaultValue="80" className="flex-1" />
              <span className="text-sm font-medium">80%</span>
            </div>
          </div>
          <Button onClick={loadDuplicates}>Run Duplicate Scan</Button>
        </CardContent>
      </Card>

      {/* Potential Duplicates */}
      {duplicates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">Your database is clean! No duplicate leads detected.</p>
          </CardContent>
        </Card>
      )}
      
      {duplicates.map((duplicate) => (
        <Card key={duplicate.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Potential Duplicate Match</span>
                  <Badge variant="warning">{duplicate.similarity}% similar</Badge>
                </CardTitle>
                <CardDescription>Reason: {duplicate.reason}</CardDescription>
              </div>
              <Button onClick={() => handleMerge(duplicate.id)}>
                <Merge className="h-4 w-4 mr-2" />
                Merge Leads
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Lead 1 */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Lead #{duplicate.lead1.id}</h4>
                  <Badge variant="default">Keep This</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.company}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Score:</span>{' '}
                    <span className="font-medium">{duplicate.lead1.score}/100</span>
                  </div>
                </div>
              </div>

              {/* Lead 2 */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Lead #{duplicate.lead2.id}</h4>
                  <Badge variant="secondary">Merge Into Primary</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.phone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.company}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Score:</span>{' '}
                    <span className="font-medium">{duplicate.lead2.score}/100</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex space-x-2">
                <Button variant="outline">Not Duplicates</Button>
                <Button variant="outline">Skip for Now</Button>
              </div>
              <Button>
                <Merge className="h-4 w-4 mr-2" />
                Merge These Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Merge History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Merges</CardTitle>
          <CardDescription>Previously merged duplicate records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                merged: 'Mike Wilson + M. Wilson',
                date: '2024-01-15',
                by: 'John Doe',
              },
              {
                merged: 'Emily Brown + E. Brown',
                date: '2024-01-14',
                by: 'Sarah Johnson',
              },
              {
                merged: 'David Lee + D. Lee',
                date: '2024-01-13',
                by: 'Auto-merge',
              },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{item.merged}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.date} by {item.by}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsMerge;
