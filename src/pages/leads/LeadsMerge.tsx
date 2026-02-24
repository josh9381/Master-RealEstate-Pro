import { Merge, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LeadsSubNav } from '@/components/leads/LeadsSubNav';
import type { Lead } from '@/types';

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
  const [mergeSettings, setMergeSettings] = useState({
    matchEmail: true,
    matchPhone: true,
    matchName: true,
    matchCompany: false,
    threshold: 80,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: duplicatesData, isLoading, refetch: loadDuplicates } = useQuery({
    queryKey: ['lead-duplicates'],
    queryFn: async () => {
      const response = await leadsApi.getLeads({ limit: 200 });
      const leads = response.data?.leads || response.data || [];
      
      // Find potential duplicates based on merge settings
      const duplicatePairs: DuplicatePair[] = [];
      const emailMap = new Map<string, Lead>();
      const phoneMap = new Map<string, Lead>();
      const nameMap = new Map<string, Lead>();
      const companyMap = new Map<string, Lead>();
      
      leads.forEach((lead: Lead) => {
        const email = lead.email?.toLowerCase();
        const phone = lead.phone?.replace(/\D/g, '');
        const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim().toLowerCase();
        const company = lead.company?.toLowerCase();
        
        // Check for email duplicates
        if (mergeSettings.matchEmail && email && emailMap.has(email)) {
          const existing = emailMap.get(email)!;
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
        } else if (mergeSettings.matchEmail && email) {
          emailMap.set(email, lead);
        }
        
        // Check for phone duplicates
        if (mergeSettings.matchPhone && phone && phone.length >= 10 && phoneMap.has(phone)) {
          const existing = phoneMap.get(phone)!;
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
        } else if (mergeSettings.matchPhone && phone && phone.length >= 10) {
          phoneMap.set(phone, lead);
        }

        // Check for name duplicates
        if (mergeSettings.matchName && fullName.length > 1 && nameMap.has(fullName)) {
          const existing = nameMap.get(fullName)!;
          const alreadyMatched = duplicatePairs.some(
            d => (d.lead1.id === existing.id && d.lead2.id === lead.id) ||
                 (d.lead1.id === lead.id && d.lead2.id === existing.id)
          );
          if (!alreadyMatched) {
            duplicatePairs.push({
              id: duplicatePairs.length + 1,
              lead1: { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, email: existing.email, phone: existing.phone, company: existing.company, score: existing.score || 0 },
              lead2: { id: lead.id, name: `${lead.firstName} ${lead.lastName}`, email: lead.email, phone: lead.phone, company: lead.company, score: lead.score || 0 },
              similarity: 80,
              reason: 'Same full name',
            });
          }
        } else if (mergeSettings.matchName && fullName.length > 1) {
          nameMap.set(fullName, lead);
        }

        // Check for company duplicates
        if (mergeSettings.matchCompany && company && company.length > 1 && companyMap.has(company)) {
          const existing = companyMap.get(company)!;
          const alreadyMatched = duplicatePairs.some(
            d => (d.lead1.id === existing.id && d.lead2.id === lead.id) ||
                 (d.lead1.id === lead.id && d.lead2.id === existing.id)
          );
          if (!alreadyMatched) {
            duplicatePairs.push({
              id: duplicatePairs.length + 1,
              lead1: { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, email: existing.email, phone: existing.phone, company: existing.company, score: existing.score || 0 },
              lead2: { id: lead.id, name: `${lead.firstName} ${lead.lastName}`, email: lead.email, phone: lead.phone, company: lead.company, score: lead.score || 0 },
              similarity: 70,
              reason: 'Same company',
            });
          }
        } else if (mergeSettings.matchCompany && company && company.length > 1) {
          companyMap.set(company, lead);
        }
      });

      // Filter by similarity threshold
      const filteredPairs = duplicatePairs.filter(d => d.similarity >= mergeSettings.threshold);
      return {
        duplicates: filteredPairs,
        stats: {
          potential: filteredPairs.length,
          mergedMonth: 0,
          autoMerged: 0,
        },
      };
    },
  });

  const duplicates = duplicatesData?.duplicates ?? [];
  const stats = duplicatesData?.stats ?? { potential: 0, mergedMonth: 0, autoMerged: 0 };

  const handleMerge = async (duplicateId: number) => {
    const duplicate = duplicates.find(d => d.id === duplicateId);
    if (!duplicate) return;

    try {
      // Call the merge API endpoint
      await leadsApi.mergeLeads({
        primaryLeadId: String(duplicate.lead1.id),
        secondaryLeadId: String(duplicate.lead2.id),
      });
      
      toast.success(`Merged leads #${duplicate.lead1.id} and #${duplicate.lead2.id}`);
      
      // Remove from list
      queryClient.setQueryData(['lead-duplicates'], (old: typeof duplicatesData) => {
        if (!old) return old;
        const updated = old.duplicates.filter(d => d.id !== duplicateId);
        return { duplicates: updated, stats: { ...old.stats, potential: old.stats.potential - 1, mergedMonth: old.stats.mergedMonth + 1 } };
      });
    } catch (error: unknown) {
      // Handle 404 gracefully — merge endpoint may not be deployed yet
      const err = error as { response?: { status?: number } }
      if (err?.response?.status === 404) {
        toast.error('Merge endpoint not available yet. Please try again later.');
      } else {
        console.error('Error merging leads:', error);
        toast.error('Failed to merge leads');
      }
    }
  };

  const handleDismiss = (duplicateId: number) => {
    queryClient.setQueryData(['lead-duplicates'], (old: typeof duplicatesData) => {
      if (!old) return old;
      const updated = old.duplicates.filter(d => d.id !== duplicateId);
      return { duplicates: updated, stats: { ...old.stats, potential: old.stats.potential - 1 } };
    });
    toast.info('Marked as not duplicate');
  };

  const handleSkip = (duplicateId: number) => {
    queryClient.setQueryData(['lead-duplicates'], (old: typeof duplicatesData) => {
      if (!old) return old;
      const updated = old.duplicates.filter(d => d.id !== duplicateId);
      return { duplicates: updated, stats: old.stats };
    });
    toast.info('Skipped for now');
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <LeadsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merge Duplicate Leads</h1>
          <p className="text-muted-foreground mt-2">
            Find and merge duplicate lead records
          </p>
        </div>
        <Button onClick={() => { loadDuplicates(); }} disabled={isLoading}>
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
            <p className="text-xs text-muted-foreground" title="Auto-merge rules are coming soon">Coming Soon</p>
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
              <input 
                type="checkbox" 
                checked={mergeSettings.matchEmail} 
                onChange={(e) => setMergeSettings(prev => ({ ...prev, matchEmail: e.target.checked }))}
                className="rounded" 
              />
              <span className="text-sm">Match by email address</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={mergeSettings.matchPhone} 
                onChange={(e) => setMergeSettings(prev => ({ ...prev, matchPhone: e.target.checked }))}
                className="rounded" 
              />
              <span className="text-sm">Match by phone number</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={mergeSettings.matchName} 
                onChange={(e) => setMergeSettings(prev => ({ ...prev, matchName: e.target.checked }))}
                className="rounded" 
              />
              <span className="text-sm">Match by full name</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={mergeSettings.matchCompany} 
                onChange={(e) => setMergeSettings(prev => ({ ...prev, matchCompany: e.target.checked }))}
                className="rounded" 
              />
              <span className="text-sm">Match by company name</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Similarity Threshold</label>
            <div className="flex items-center space-x-4">
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={mergeSettings.threshold} 
                onChange={(e) => setMergeSettings(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                className="flex-1" 
              />
              <span className="text-sm font-medium">{mergeSettings.threshold}%</span>
            </div>
          </div>
          <Button onClick={() => { loadDuplicates(); }}>Run Duplicate Scan</Button>
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
                <Button variant="outline" onClick={() => handleDismiss(duplicate.id)}>Not Duplicates</Button>
                <Button variant="outline" onClick={() => handleSkip(duplicate.id)}>Skip for Now</Button>
              </div>
              <Button onClick={() => handleMerge(duplicate.id)}>
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
          {stats.mergedMonth === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No merge history yet. Merged records will appear here.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {stats.mergedMonth} leads merged this session.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsMerge;
