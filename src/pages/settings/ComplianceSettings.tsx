import { Shield, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

const ComplianceSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings Saved', 'Compliance settings have been updated successfully.');
    } catch (error) {
      toast.error('Error', 'Failed to save compliance settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compliance Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure TCPA, DNC, GDPR, and other compliance requirements
        </p>
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
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Compliant</span>
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
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Protected</span>
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
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Enabled</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,456</div>
            <p className="text-xs text-muted-foreground">This month</p>
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
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm font-medium">Enable CCPA compliance features</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Display "Do Not Sell My Info" link</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm">Track and respond to consumer requests</span>
            </label>
          </div>
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded" />
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
            {[
              {
                action: 'DNC Registry Updated',
                user: 'System',
                time: '2 hours ago',
                type: 'info',
              },
              {
                action: 'GDPR Data Export Request',
                user: 'John Doe',
                time: '5 hours ago',
                type: 'warning',
              },
              {
                action: 'Consent Record Created',
                user: 'Sarah Johnson',
                time: '1 day ago',
                type: 'success',
              },
              {
                action: 'TCPA Violation Prevented',
                user: 'System',
                time: '2 days ago',
                type: 'error',
              },
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {log.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {log.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                  {log.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  {log.type === 'info' && <FileText className="h-5 w-5 text-blue-600" />}
                  <div>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user} • {log.time}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </div>
            ))}
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
        <Button onClick={handleSave} loading={loading}>Save All Settings</Button>
      </div>
    </div>
  );
};

export default ComplianceSettings;
