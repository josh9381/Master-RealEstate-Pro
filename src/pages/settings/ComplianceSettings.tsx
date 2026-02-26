import { Shield, CheckCircle, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { settingsApi, activitiesApi } from '@/lib/api';

const ComplianceSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tcpaEnabled, setTcpaEnabled] = useState(true);
  const [requireConsent, setRequireConsent] = useState(true);
  const [blockRevokedConsent, setBlockRevokedConsent] = useState(true);
  const [dncEnabled, setDncEnabled] = useState(true);
  const [autoCheckDnc, setAutoCheckDnc] = useState(true);
  const [blockDncNumbers, setBlockDncNumbers] = useState(true);
  const [gdprEnabled, setGdprEnabled] = useState(true);
  const [rightToErasure, setRightToErasure] = useState(true);
  const [dataPortability, setDataPortability] = useState(true);
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [logAllChanges, setLogAllChanges] = useState(true);
  const [retentionDays, setRetentionDays] = useState('365');
  const [ccpaEnabled, setCcpaEnabled] = useState(true);
  const [ccpaDoNotSell, setCcpaDoNotSell] = useState(true);
  const [ccpaConsumerRequests, setCcpaConsumerRequests] = useState(true);
  const [ccpaDisclosePractices, setCcpaDisclosePractices] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const settings = await settingsApi.getBusinessSettings();
      if (settings) {
        const data = settings.data || settings;
        if (data.tcpaEnabled !== undefined) setTcpaEnabled(data.tcpaEnabled);
        if (data.requireConsent !== undefined) setRequireConsent(data.requireConsent);
        if (data.blockRevokedConsent !== undefined) setBlockRevokedConsent(data.blockRevokedConsent);
        if (data.dncEnabled !== undefined) setDncEnabled(data.dncEnabled);
        if (data.autoCheckDnc !== undefined) setAutoCheckDnc(data.autoCheckDnc);
        if (data.blockDncNumbers !== undefined) setBlockDncNumbers(data.blockDncNumbers);
        if (data.gdprEnabled !== undefined) setGdprEnabled(data.gdprEnabled);
        if (data.rightToErasure !== undefined) setRightToErasure(data.rightToErasure);
        if (data.dataPortability !== undefined) setDataPortability(data.dataPortability);
        if (data.auditEnabled !== undefined) setAuditEnabled(data.auditEnabled);
        if (data.logAllChanges !== undefined) setLogAllChanges(data.logAllChanges);
        if (data.retentionDays !== undefined) setRetentionDays(String(data.retentionDays));
        if (data.ccpaEnabled !== undefined) setCcpaEnabled(data.ccpaEnabled);
        if (data.ccpaDoNotSell !== undefined) setCcpaDoNotSell(data.ccpaDoNotSell);
        if (data.ccpaConsumerRequests !== undefined) setCcpaConsumerRequests(data.ccpaConsumerRequests);
        if (data.ccpaDisclosePractices !== undefined) setCcpaDisclosePractices(data.ccpaDisclosePractices);
      }
      if (isRefresh) toast.success('Settings refreshed');
    } catch (error) {
      console.error('Failed to load compliance settings:', error);
      toast.error('Failed to load settings, using defaults');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadSettings(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateBusinessSettings({
        tcpaEnabled,
        requireConsent,
        blockRevokedConsent,
        dncEnabled,
        autoCheckDnc,
        blockDncNumbers,
        gdprEnabled,
        rightToErasure,
        dataPortability,
        auditEnabled,
        logAllChanges,
        retentionDays: parseInt(retentionDays, 10),
        ccpaEnabled,
        ccpaDoNotSell,
        ccpaConsumerRequests,
        ccpaDisclosePractices,
      });
      toast.success('Settings Saved', 'Compliance settings have been updated successfully.');
    } catch (error) {
      toast.error('Error', 'Failed to save compliance settings.');
    } finally {
      setSaving(false);
    }
  };

  // Fetch real audit log entries from activity feed
  const { data: auditLogsData } = useQuery({
    queryKey: ['compliance-audit-logs'],
    queryFn: () => activitiesApi.getActivities(),
    enabled: auditEnabled,
  });
  const auditLogs = (auditLogsData?.activities || []).slice(0, 6);

  return (
    <div className="space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading compliance settings...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure TCPA, DNC, GDPR, and other compliance requirements
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Compliance Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TCPA Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {tcpaEnabled ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium">Compliant</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Not Enabled</span></>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DNC Registry</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {dncEnabled ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium">Protected</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Not Enabled</span></>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDPR</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {gdprEnabled ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium">Enabled</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Disabled</span></>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {auditEnabled ? (
                <><CheckCircle className="h-5 w-5 text-green-600" /><span className="text-sm font-medium">Enabled</span></>
              ) : (
                <><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Disabled</span></>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TCPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>TCPA (Telephone Consumer Protection Act)</CardTitle>
          <CardDescription>Configure calling and texting compliance rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-900">TCPA Compliance Active</h4>
            </div>
            <p className="text-sm text-green-700">
              All outbound calls and SMS are protected by TCPA compliance rules.
            </p>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={requireConsent}
                onChange={(e) => setRequireConsent(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">
                Require express written consent before calling/texting
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={blockRevokedConsent}
                onChange={(e) => setBlockRevokedConsent(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">
                Block calls/texts outside of 8 AM - 9 PM local time
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={tcpaEnabled}
                onChange={(e) => setTcpaEnabled(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">
                Include opt-out instructions in all SMS messages
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">
                Maintain consent records for 4 years
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Do Not Call Registry */}
      <Card>
        <CardHeader>
          <CardTitle>Do Not Call (DNC) Registry</CardTitle>
          <CardDescription>Prevent calls to registered numbers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input 
                type="checkbox" 
                checked={dncEnabled}
                onChange={(e) => setDncEnabled(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Enable DNC registry checking</span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">DNC List Provider</label>
            <select className="w-full px-3 py-2 border rounded-lg" defaultValue="national">
              <option value="national">National DNC Registry</option>
              <option value="state">State DNC Lists</option>
              <option value="internal">Internal DNC List Only</option>
              <option value="all">All Lists Combined</option>
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Last Registry Update</label>
              <input
                type="text"
                value="January 15, 2024"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Blocked Numbers</label>
              <input
                type="text"
                value="45,678"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-muted"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button>Update DNC Registry</Button>
            <Button variant="outline">Upload Internal List</Button>
          </div>
        </CardContent>
      </Card>

      {/* GDPR Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>GDPR (General Data Protection Regulation)</CardTitle>
          <CardDescription>European data protection compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input 
                type="checkbox" 
                checked={gdprEnabled}
                onChange={(e) => setGdprEnabled(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Enable GDPR compliance features</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoCheckDnc}
                onChange={(e) => setAutoCheckDnc(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">
                Allow users to request their data (Right to Access)
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rightToErasure}
                onChange={(e) => setRightToErasure(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">
                Allow users to delete their data (Right to Erasure)
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={dataPortability}
                onChange={(e) => setDataPortability(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">
                Allow users to export their data (Data Portability)
              </span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={blockDncNumbers}
                onChange={(e) => setBlockDncNumbers(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm">
                Require explicit consent for data processing
              </span>
            </label>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Data Retention Period (days)</label>
            <input
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Automatically delete inactive data after this period
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CCPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>CCPA (California Consumer Privacy Act)</CardTitle>
          <CardDescription>California privacy compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center space-x-2 cursor-pointer mb-4">
              <input type="checkbox" checked={ccpaEnabled} onChange={(e) => setCcpaEnabled(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium">Enable CCPA compliance features</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={ccpaDoNotSell} onChange={(e) => setCcpaDoNotSell(e.target.checked)} className="rounded" />
              <span className="text-sm">Display "Do Not Sell My Info" link</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={ccpaConsumerRequests} onChange={(e) => setCcpaConsumerRequests(e.target.checked)} className="rounded" />
              <span className="text-sm">Track and respond to consumer requests</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={ccpaDisclosePractices} onChange={(e) => setCcpaDisclosePractices(e.target.checked)} className="rounded" />
              <span className="text-sm">Disclose data collection practices</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Management</CardTitle>
          <CardDescription>Track and manage user consents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600">3,456</p>
              <p className="text-sm text-muted-foreground mt-1">Active Consents</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-orange-600">234</p>
              <p className="text-sm text-muted-foreground mt-1">Pending Renewals</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold text-red-600">89</p>
              <p className="text-sm text-muted-foreground mt-1">Withdrawn</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Consent Types</label>
            <div className="space-y-2">
              {[
                { type: 'Email Marketing', enabled: true },
                { type: 'SMS Marketing', enabled: true },
                { type: 'Phone Calls', enabled: true },
                { type: 'Data Processing', enabled: true },
                { type: 'Third-party Sharing', enabled: false },
              ].map((consent, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">{consent.type}</span>
                  <label className="relative inline-block w-12 h-6">
                    <input type="checkbox" defaultChecked={consent.enabled} className="sr-only peer" />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Audit Logs</CardTitle>
              <CardDescription>Recent compliance-related activities</CardDescription>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input 
                type="checkbox" 
                checked={auditEnabled}
                onChange={(e) => setAuditEnabled(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={logAllChanges}
                onChange={(e) => setLogAllChanges(e.target.checked)}
                className="rounded" 
              />
              <span className="text-sm font-medium">Log all compliance-related changes</span>
            </label>
          </div>
          <div className="space-y-3">
            {auditLogs.length > 0 ? auditLogs.map((log: any, index: number) => (
              <div key={log.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {log.type?.includes('STATUS') ? <AlertTriangle className="h-5 w-5 text-orange-600" /> :
                   log.type?.includes('NOTE') || log.type?.includes('CREATED') ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                   <FileText className="h-5 w-5 text-blue-600" />}
                  <div>
                    <p className="font-medium text-sm">{log.title || log.type || 'Activity'}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System'} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                {auditEnabled ? 'No recent audit log entries' : 'Audit logging is disabled'}
              </div>
            )}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">
              View All Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy & Terms</CardTitle>
          <CardDescription>Configure your privacy documentation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Privacy Policy URL</label>
            <input
              type="text"
              placeholder="https://yourcompany.com/privacy"
              defaultValue="https://yourcrm.com/privacy"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Terms of Service URL</label>
            <input
              type="text"
              placeholder="https://yourcompany.com/terms"
              defaultValue="https://yourcrm.com/terms"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Cookie Policy URL</label>
            <input
              type="text"
              placeholder="https://yourcompany.com/cookies"
              defaultValue="https://yourcrm.com/cookies"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <Button>Save Policy URLs</Button>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
        </>
      )}
    </div>
  );
};

export default ComplianceSettings;
