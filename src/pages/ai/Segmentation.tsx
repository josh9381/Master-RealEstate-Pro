import { useState, useEffect } from 'react';
import { Users, Plus, Filter, Trash2, Edit, RefreshCw, Eye, X, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { segmentsApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: SegmentRule[];
  matchType: string;
  memberCount: number;
  isActive: boolean;
  color: string;
  createdAt: string;
}

interface SegmentMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  status: string;
  company: string | null;
}

const FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'score', label: 'Lead Score' },
  { value: 'source', label: 'Source' },
  { value: 'company', label: 'Company' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'estimatedValue', label: 'Estimated Value' },
  { value: 'stage', label: 'Pipeline Stage' },
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'isNull', label: 'Is Empty' },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1',
];

const Segmentation = () => {
  const { toast } = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [viewingSegment, setViewingSegment] = useState<Segment | null>(null);
  const [members, setMembers] = useState<SegmentMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRules, setFormRules] = useState<SegmentRule[]>([{ field: 'status', operator: 'equals', value: '' }]);
  const [formMatchType, setFormMatchType] = useState('all');
  const [formColor, setFormColor] = useState('#3B82F6');

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    setIsLoading(true);
    try {
      const response = await segmentsApi.getSegments();
      setSegments(response.data || response.segments || []);
    } catch (error) {
      console.error('Error loading segments:', error);
      toast.error('Failed to load segments');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormRules([{ field: 'status', operator: 'equals', value: '' }]);
    setFormMatchType('all');
    setFormColor('#3B82F6');
    setEditingSegment(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormName(segment.name);
    setFormDescription(segment.description || '');
    setFormRules(segment.rules.length > 0 ? segment.rules : [{ field: 'status', operator: 'equals', value: '' }]);
    setFormMatchType(segment.matchType);
    setFormColor(segment.color);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a segment name');
      return;
    }

    const validRules = formRules.filter(r => r.field && r.operator);
    if (validRules.length === 0) {
      toast.error('Please add at least one rule');
      return;
    }

    try {
      const data = {
        name: formName,
        description: formDescription || undefined,
        rules: validRules,
        matchType: formMatchType,
        color: formColor,
      };

      if (editingSegment) {
        await segmentsApi.updateSegment(editingSegment.id, data);
        toast.success('Segment updated');
      } else {
        await segmentsApi.createSegment(data);
        toast.success('Segment created');
      }

      setShowCreateDialog(false);
      resetForm();
      loadSegments();
    } catch (error) {
      console.error('Error saving segment:', error);
      toast.error('Failed to save segment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return;
    try {
      await segmentsApi.deleteSegment(id);
      toast.success('Segment deleted');
      loadSegments();
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast.error('Failed to delete segment');
    }
  };

  const viewMembers = async (segment: Segment) => {
    setViewingSegment(segment);
    setShowMembersDialog(true);
    try {
      const response = await segmentsApi.getSegmentMembers(segment.id, { limit: 50 });
      setMembers(response.data || response.members || []);
      setMembersTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load segment members');
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await segmentsApi.refreshCounts();
      await loadSegments();
      toast.success('Segment counts refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  const addRule = () => {
    setFormRules([...formRules, { field: 'status', operator: 'equals', value: '' }]);
  };

  const removeRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<SegmentRule>) => {
    setFormRules(formRules.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  const totalMembers = segments.reduce((sum, s) => sum + s.memberCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Segmentation</h1>
          <p className="text-muted-foreground mt-2">
            Create rule-based segments to target specific groups of leads
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Counts
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Segments</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground">Active groupings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all segments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Segments</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.filter(s => s.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {segments.length > 0 ? Math.round(totalMembers / segments.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per segment</p>
          </CardContent>
        </Card>
      </div>

      {/* Segments Grid */}
      {segments.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Segments Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first segment to start targeting specific groups of leads.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Segment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => (
            <Card key={segment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                    <div>
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                    </div>
                  </div>
                  <Badge variant={segment.isActive ? 'default' : 'secondary'}>
                    {segment.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>{segment.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Members:</span>
                    <span className="font-semibold">{segment.memberCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Rules:</span>
                    <span className="font-semibold">{segment.rules.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Match:</span>
                    <Badge variant="outline">{segment.matchType === 'all' ? 'All rules' : 'Any rule'}</Badge>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Rules:</p>
                    <div className="flex flex-wrap gap-1">
                      {segment.rules.slice(0, 3).map((rule: SegmentRule, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {rule.field} {rule.operator} {rule.value}
                        </Badge>
                      ))}
                      {segment.rules.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{segment.rules.length - 3} more</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => viewMembers(segment)}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(segment)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(segment.id)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Segment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
            <DialogDescription>
              Define rules to automatically group leads into this segment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Segment Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., High-Value Prospects"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe this segment..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormColor(c)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Match Type</label>
              <select
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={formMatchType}
                onChange={(e) => setFormMatchType(e.target.value)}
              >
                <option value="all">Match ALL rules (AND)</option>
                <option value="any">Match ANY rule (OR)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Rules</label>
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-2">
                {formRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <select
                      className="flex-1 px-2 py-1.5 border rounded text-sm"
                      value={rule.field}
                      onChange={(e) => updateRule(idx, { field: e.target.value })}
                    >
                      {FIELD_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    <select
                      className="flex-1 px-2 py-1.5 border rounded text-sm"
                      value={rule.operator}
                      onChange={(e) => updateRule(idx, { operator: e.target.value })}
                    >
                      {OPERATOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>

                    {rule.operator !== 'isNull' && (
                      <Input
                        className="flex-1"
                        value={rule.value}
                        onChange={(e) => updateRule(idx, { value: e.target.value })}
                        placeholder="Value..."
                      />
                    )}

                    {formRules.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeRule(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingSegment ? 'Update Segment' : 'Create Segment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingSegment?.name} — Members ({membersTotal})
            </DialogTitle>
            <DialogDescription>
              Leads matching this segment&apos;s rules
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {members.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No members match this segment&apos;s rules.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-left py-2 px-3 font-medium">Email</th>
                      <th className="text-left py-2 px-3 font-medium">Company</th>
                      <th className="text-left py-2 px-3 font-medium">Score</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-t">
                        <td className="py-2 px-3">{member.firstName} {member.lastName}</td>
                        <td className="py-2 px-3 text-muted-foreground">{member.email}</td>
                        <td className="py-2 px-3">{member.company || '—'}</td>
                        <td className="py-2 px-3">
                          <Badge variant={member.score >= 80 ? 'default' : member.score >= 50 ? 'secondary' : 'outline'}>
                            {member.score}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline">{member.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Segmentation;
