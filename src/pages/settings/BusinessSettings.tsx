import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, RefreshCw } from 'lucide-react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const BusinessSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Company Information
  const [companyName, setCompanyName] = useState('Acme Corporation');
  const [industry, setIndustry] = useState('Technology');
  const [companySize, setCompanySize] = useState('11-50 employees');
  const [taxId, setTaxId] = useState('12-3456789');
  const [website, setWebsite] = useState('https://www.acmecorp.com');
  
  // Contact Information
  const [email, setEmail] = useState('contact@acmecorp.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [address, setAddress] = useState('123 Business Ave');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('94105');
  const [country, setCountry] = useState('United States');
  
  // Preferences
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [currency, setCurrency] = useState('USD');
  
  const { data: businessData, isLoading: loading, isFetching: refreshing, refetch } = useQuery({
    queryKey: ['settings', 'business'],
    queryFn: async () => {
      const response = await settingsApi.getBusinessSettings();
      return response;
    },
  });

  // Sync fetched data into form state
  useEffect(() => {
    if (businessData) {
      setCompanyName(businessData.companyName || 'Acme Corporation');
      setIndustry(businessData.industry || 'Technology');
      setCompanySize(businessData.companySize || '11-50 employees');
      setTaxId(businessData.taxId || '');
      setWebsite(businessData.website || '');
      setEmail(businessData.email || '');
      setPhone(businessData.phone || '');
      setAddress(businessData.address || '');
      setCity(businessData.city || '');
      setState(businessData.state || '');
      setZipCode(businessData.zipCode || '');
      setCountry(businessData.country || 'United States');
      setTimezone(businessData.timezone || 'America/Los_Angeles');
      setDateFormat(businessData.dateFormat || 'MM/DD/YYYY');
      setCurrency(businessData.currency || 'USD');
    }
  }, [businessData]);

  const handleRefresh = () => {
    refetch();
  };
  
  const handleLogoUpload = () => {
    toast.info('Logo upload feature coming soon!');
  };
  
  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return await settingsApi.updateBusinessSettings(data);
    },
    onSuccess: () => {
      toast.success('Business settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['settings', 'business'] });
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    if (!companyName || !email) {
      toast.error('Please fill in required fields');
      return;
    }
    
    saveMutation.mutate({
      companyName,
      industry,
      companySize,
      taxId,
      website,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      timezone,
      dateFormat,
      currency,
    });
  };

  if (loading) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your business information and branding</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Company Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>Upload your company logo for branding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
              <Building className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Button variant="outline" onClick={handleLogoUpload}>Upload Logo</Button>
              <p className="text-xs text-muted-foreground">
                PNG or JPG. Max 2MB. Recommended: 200x200px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Basic details about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Company Name</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Finance</option>
                <option>Retail</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Company Size</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
              >
                <option>1-10 employees</option>
                <option>11-50 employees</option>
                <option>51-200 employees</option>
                <option>201-500 employees</option>
                <option>500+ employees</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tax ID</label>
            <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Website</label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>How customers can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Website</label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Business Address */}
      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>Your primary business location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Street Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">State / Province</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ZIP / Postal Code</label>
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Country</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Australia</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>Timezone and currency preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Timezone</label>
            <select 
              className="w-full p-2 border rounded-md"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Format</label>
            <select 
              className="w-full p-2 border rounded-md"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Currency</label>
            <select 
              className="w-full p-2 border rounded-md"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default BusinessSettings;
