import { Building, Mail, Phone, Globe, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const BusinessSettings = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Business Settings</h1>
        <p className="text-muted-foreground mt-2">Configure your business information and branding</p>
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
              <Button variant="outline">Upload Logo</Button>
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
            <Input defaultValue="Acme Corporation" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Industry</label>
              <select className="w-full p-2 border rounded-md">
                <option>Technology</option>
                <option>Healthcare</option>
                <option>Finance</option>
                <option>Retail</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Company Size</label>
              <select className="w-full p-2 border rounded-md">
                <option>1-10 employees</option>
                <option>11-50 employees</option>
                <option>51-200 employees</option>
                <option>201-500 employees</option>
                <option>500+ employees</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md"
              placeholder="Brief description of your business..."
              defaultValue="Leading provider of innovative CRM solutions for modern businesses."
            />
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
              <Input type="tel" defaultValue="+1 (555) 123-4567" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input type="email" defaultValue="contact@acmecorp.com" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Website</label>
            <Input type="url" defaultValue="https://acmecorp.com" />
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
            <Input defaultValue="123 Main Street" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Address Line 2</label>
            <Input placeholder="Suite, floor, etc. (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input defaultValue="San Francisco" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">State / Province</label>
              <Input defaultValue="California" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ZIP / Postal Code</label>
              <Input defaultValue="94105" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Country</label>
              <select className="w-full p-2 border rounded-md">
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

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>When your business is open</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            (day) => (
              <div key={day} className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 w-32">
                  <input type="checkbox" defaultChecked={day !== 'Sunday'} className="rounded" />
                  <span className="text-sm font-medium">{day}</span>
                </label>
                <Input type="time" defaultValue="09:00" className="w-32" />
                <span className="text-muted-foreground">to</span>
                <Input type="time" defaultValue="17:00" className="w-32" />
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
};

export default BusinessSettings;
