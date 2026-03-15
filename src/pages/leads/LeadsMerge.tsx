import { logger } from '@/lib/logger'
import { Merge, AlertTriangle, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { LeadsSubNav } from '@/components/leads/LeadsSubNav';

interface LeadData {
  id: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  source?: string | null;
  score?: number | null;
  status?: string | null;
  value?: number | null;
  propertyType?: string | null;
  transactionType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preApprovalStatus?: string | null;
  moveInTimeline?: string | null;
  desiredLocation?: string | null;
  bedsMin?: number | null;
  bathsMin?: number | null;
}

interface DuplicatePair {
  id: number;
  lead1: LeadData;
  lead2: LeadData;
  similarity: number;
  reason: string;
}

type FieldSelection = Record<string, 'primary' | 'secondary'>;

const MERGE_FIELDS: { key: keyof LeadData; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'position', label: 'Position' },
  { key: 'source', label: 'Source' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
  { key: 'value', label: 'Value' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'transactionType', label: 'Transaction Type' },
  { key: 'budgetMin', label: 'Budget Min' },
  { key: 'budgetMax', label: 'Budget Max' },
  { key: 'preApprovalStatus', label: 'Pre-Approval' },
  { key: 'moveInTimeline', label: 'Move-In Timeline' },
  { key: 'desiredLocation', label: 'Desired Location' },
  { key: 'bedsMin', label: 'Min Beds' },
  { key: 'bathsMin', label: 'Min Baths' },
];

const LeadsMerge = () => {
  const [mergeSettings, setMergeSettings] = useState({
    matchEmail: true,
    matchPhone: true,
    matchName: true,
    matchCompany: false,
    threshold: 80,
  });
  const [expandedPair, setExpandedPair] = useState<number | null>(null);
  const [fieldSelections, setFieldSelections] = useState<Record<number, FieldSelection>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: duplicatesData, isLoading, refetch: loadDuplicates } = useQuery({
    queryKey: ['lead-duplicates'],
    queryFn: async () => {
      try {
        const result = await leadsApi.scanDuplicates({
          matchEmail: mergeSettings.matchEmail,
          matchPhone: mergeSettings.matchPhone,
          matchName: mergeSettings.matchName,
        });

        const serverPairs = result.data?.duplicates || [];
        const pairs: DuplicatePair[] = serverPairs
          .filter((p: { similarity: number }) => p.similarity >= mergeSettings.threshold)
          .map((p: { lead1: LeadData; lead2: LeadData; similarity: number; reason: string }, i: number) => ({
            id: i + 1,
            lead1: p.lead1,
            lead2: p.lead2,
            similarity: p.similarity,
            reason: p.reason,
          }));

        return {
          duplicates: pairs,
          stats: {
            potential: pairs.length,
            mergedMonth: 0,
            autoMerged: 0,
          },
        };
      } catch (error) {
        logger.error('Failed to scan for duplicates:', error)
        toast.error('Failed to scan for duplicates');
        return { duplicates: [], stats: { potential: 0, mergedMonth: 0, autoMerged: 0 } };
      }
    },
  });

  const duplicates = duplicatesData?.duplicates ?? [];
  const stats = duplicatesData?.stats ?? { potential: 0, mergedMonth: 0, autoMerged: 0 };

  // Initialize field selections for a pair (default all to 'primary')
  const getFieldSelections = (pairId: number): FieldSelection => {
    if (fieldSelections[pairId]) return fieldSelections[pairId];
    const defaults: FieldSelection = {};
    MERGE_FIELDS.forEach(f => { defaults[f.key] = 'primary'; });
    return defaults;
  };

  const setFieldSelection = (pairId: number, field: string, value: 'primary' | 'secondary') => {
    setFieldSelections(prev => ({
      ...prev,
      [pairId]: { ...getFieldSelections(pairId), [field]: value },
    }));
  };

  const handleMerge = async (duplicateId: number) => {
    const duplicate = duplicates.find(d => d.id === duplicateId);
    if (!duplicate) return;

    try {
      const selections = getFieldSelections(duplicateId);
      await leadsApi.mergeLeads({
        primaryLeadId: String(duplicate.lead1.id),
        secondaryLeadId: String(duplicate.lead2.id),
        fieldSelections: selections,
      });
      
      toast.success(`Successfully merged leads`);
      
      queryClient.setQueryData(['lead-duplicates'], (old: typeof duplicatesData) => {
        if (!old) return old;
        const updated = old.duplicates.filter(d => d.id !== duplicateId);
        return { duplicates: updated, stats: { ...old.stats, potential: old.stats.potential - 1, mergedMonth: old.stats.mergedMonth + 1 } };
      });
      setExpandedPair(null);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } }
      if (err?.response?.status === 404) {
        toast.error('Merge endpoint not available yet.');
      } else {
        logger.error('Error merging leads:', error);
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
      <LeadsSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Merge Duplicate Leads</h1>
          <p className="text-muted-foreground mt-2">
            Find and merge duplicate lead records with field-level control
          </p>
        </div>
        <Button variant="outline" onClick={() => { loadDuplicates(); }} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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

      {/* No Duplicates */}
      {duplicates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
            <p className="text-muted-foreground">Your database is clean! No duplicate leads detected.</p>
          </CardContent>
        </Card>
      )}
      
      {/* Duplicate Pairs */}
      {duplicates.map((duplicate) => {
        const isExpanded = expandedPair === duplicate.id;
        const selections = getFieldSelections(duplicate.id);

        return (
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
                {!isExpanded && (
                  <Button onClick={() => setExpandedPair(duplicate.id)}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Review & Merge
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isExpanded ? (
                /* Compact view */
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">{duplicate.lead1.firstName} {duplicate.lead1.lastName}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>{duplicate.lead1.email}</div>
                      {duplicate.lead1.phone && <div>{duplicate.lead1.phone}</div>}
                      {duplicate.lead1.company && <div>{duplicate.lead1.company}</div>}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2">{duplicate.lead2.firstName} {duplicate.lead2.lastName}</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>{duplicate.lead2.email}</div>
                      {duplicate.lead2.phone && <div>{duplicate.lead2.phone}</div>}
                      {duplicate.lead2.company && <div>{duplicate.lead2.company}</div>}
                    </div>
                  </div>
                </div>
              ) : (
                /* Expanded: Field-level merge resolution */
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Click on a value to select which one to keep for each field. The selected value (highlighted) will be used in the merged lead.
                  </p>

                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium w-[20%]">Field</th>
                          <th className="px-4 py-3 text-left font-medium w-[40%]">
                            Lead A (Primary)
                            <Badge variant="default" className="ml-2 text-xs">Keep</Badge>
                          </th>
                          <th className="px-4 py-3 text-left font-medium w-[40%]">
                            Lead B (Secondary)
                            <Badge variant="secondary" className="ml-2 text-xs">Merge In</Badge>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {MERGE_FIELDS.map(({ key, label }) => {
                          const val1 = String(duplicate.lead1[key] ?? '');
                          const val2 = String(duplicate.lead2[key] ?? '');
                          const selected = selections[key] || 'primary';
                          const isDifferent = val1 !== val2;

                          return (
                            <tr key={key} className={isDifferent ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                              <td className="px-4 py-2.5 font-medium text-muted-foreground">{label}</td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => setFieldSelection(duplicate.id, key, 'primary')}
                                  className={`w-full text-left px-3 py-1.5 rounded transition-colors ${
                                    selected === 'primary'
                                      ? 'bg-primary/10 border border-primary text-foreground font-medium'
                                      : 'hover:bg-muted/50 text-muted-foreground'
                                  }`}
                                >
                                  {val1 || <span className="italic text-muted-foreground/50">empty</span>}
                                </button>
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  onClick={() => setFieldSelection(duplicate.id, key, 'secondary')}
                                  className={`w-full text-left px-3 py-1.5 rounded transition-colors ${
                                    selected === 'secondary'
                                      ? 'bg-primary/10 border border-primary text-foreground font-medium'
                                      : 'hover:bg-muted/50 text-muted-foreground'
                                  }`}
                                >
                                  {val2 || <span className="italic text-muted-foreground/50">empty</span>}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Merge className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      All related records (notes, tasks, calls, messages, appointments, follow-ups, workflow history) will be transferred to the merged lead. Lead B will be deleted.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => handleDismiss(duplicate.id)}>Not Duplicates</Button>
                  <Button variant="outline" onClick={() => { handleSkip(duplicate.id); setExpandedPair(null); }}>Skip for Now</Button>
                  {isExpanded && (
                    <Button variant="outline" onClick={() => setExpandedPair(null)}>Collapse</Button>
                  )}
                </div>
                <Button onClick={() => {
                  if (!isExpanded) {
                    setExpandedPair(duplicate.id);
                  } else {
                    handleMerge(duplicate.id);
                  }
                }}>
                  <Merge className="h-4 w-4 mr-2" />
                  {isExpanded ? 'Merge These Leads' : 'Review & Merge'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

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
