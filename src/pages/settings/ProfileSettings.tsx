import { Camera, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const ProfileSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Basic Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Password Change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Contact Information
  const [company, setCompany] = useState('Acme Corporation');
  const [address, setAddress] = useState('123 Main St');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [zipCode, setZipCode] = useState('94105');
  const [country, setCountry] = useState('United States');
  
  // Preferences
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  
  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await settingsApi.getProfile();
      const user = response.data?.user;
      
      if (user) {
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
        // Phone is not in the user model yet, keep empty
        setPhone('');
        // Job title is not in the user model yet, keep empty
        setJobTitle('');
        // Company, address, etc. are not in the user model yet
        setCompany('');
        setAddress('');
        setCity('');
        setState('');
        setZipCode('');
        setCountry('United States');
        setLanguage(user.language || 'en');
        setTimezone(user.timezone || 'America/Los_Angeles');
        setDateFormat('MM/DD/YYYY');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadProfile(true);
  };
  
  const handlePhotoUpload = async () => {
    toast.info('Photo upload feature coming soon!');
    // In a real app, this would open a file picker
  };

  const handleSave = async () => {
    if (!firstName || !lastName || !email) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const response = await settingsApi.updateProfile({
        firstName,
        lastName,
        email,
        timezone,
        language
      });
      
      if (response.success) {
        toast.success('Profile updated successfully');
        await loadProfile(true);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await settingsApi.changePassword({
        currentPassword,
        newPassword
      });

      if (response.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and preferences</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Profile Photo */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="relative">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={`${firstName} ${lastName}`}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                  {firstName?.[0] || 'U'}{lastName?.[0] || 'U'}
                </div>
              )}
              <button 
                onClick={handlePhotoUpload}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full border shadow-sm hover:bg-accent"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" onClick={handlePhotoUpload}>Upload Photo</Button>
              <p className="text-xs text-muted-foreground">
                JPG, GIF or PNG. Max size of 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">First Name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Last Name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Phone</label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Job Title</label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Your business contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Company</label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">State</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ZIP Code</label>
              <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Country</label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Language</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English (US)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Timezone</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Format</label>
            <select 
              className="w-full p-2 border rounded-md bg-background"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Password & Security */}
      <Card>
        <CardHeader>
          <CardTitle>Password & Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordSection ? (
            <Button 
              variant="outline" 
              onClick={() => setShowPasswordSection(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Current Password</label>
                <Input 
                  type="password" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">New Password</label>
                <Input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters long
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Confirm New Password</label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
