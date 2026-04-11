import { logger } from '@/lib/logger'
import { Camera, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/shared/LoadingSkeleton';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { settingsApi } from '@/lib/api';

const ProfileSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Basic Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [avatar, setAvatar] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  

  
  // Preferences
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  
  const { data: profileData, isLoading: loading, isFetching: refreshing, refetch } = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => {
      const response = await settingsApi.getProfile();
      return response.data?.user;
    },
  });

  // Sync fetched data into form state
  useEffect(() => {
    if (profileData) {
      setFirstName(profileData.firstName || '');
      setLastName(profileData.lastName || '');
      setEmail(profileData.email || '');
      setAvatar(profileData.avatar || '');
      setPhone(profileData.phone || '');
      setJobTitle(profileData.jobTitle || '');
      setLanguage(profileData.language || 'en');
      setTimezone(profileData.timezone || 'America/Los_Angeles');
      setDateFormat(profileData.dateFormat || 'MM/DD/YYYY');
    }
  }, [profileData]);

  const handleRefresh = () => {
    refetch();
  };

  const handleCancel = () => {
    if (profileData) {
      setFirstName(profileData.firstName || '');
      setLastName(profileData.lastName || '');
      setEmail(profileData.email || '');
      setPhone(profileData.phone || '');
      setJobTitle(profileData.jobTitle || '');
      setLanguage(profileData.language || 'en');
      setTimezone(profileData.timezone || 'America/Los_Angeles');
      setDateFormat(profileData.dateFormat || 'MM/DD/YYYY');
      setAvatar(profileData.avatar || '');
    }
  };
  
  const handlePhotoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File is too large. Maximum size is 10 MB.');
        return;
      }
      try {
        const result = await settingsApi.uploadAvatar(file);
        setAvatar(result.data?.avatar || result.avatar || '');
        queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
        toast.success('Profile photo updated!');
      } catch (err) {
        logger.error('Avatar upload failed:', err);
        toast.error('Failed to upload photo. Please try again.');
      }
    };
    input.click();
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; phone: string; jobTitle: string; timezone: string; language: string; dateFormat: string }) => {
      return await settingsApi.updateProfile(data);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] });
    },
    onError: (error) => {
      logger.error('Failed to update profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    },
  });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!firstName) errors.firstName = 'First name is required';
    if (!lastName) errors.lastName = 'Last name is required';
    if (!email) errors.email = 'Email is required';
    else if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    
    saveMutation.mutate({
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      timezone,
      language,
      dateFormat,
    });
  };



  if (loading) {
    return <LoadingSpinner text="Loading profile settings..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile Settings</h1>
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
                className="absolute bottom-0 right-0 p-2 bg-card rounded-full border shadow-sm hover:bg-accent transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Button variant="outline" onClick={handlePhotoUpload}>Upload Photo</Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, or GIF. Max size of 10 MB.
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
              <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); setFieldErrors(prev => ({ ...prev, firstName: '' })) }} className={fieldErrors.firstName ? 'border-destructive' : ''} />
              {fieldErrors.firstName && <p className="text-sm text-destructive mt-1">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Last Name</label>
              <Input value={lastName} onChange={(e) => { setLastName(e.target.value); setFieldErrors(prev => ({ ...prev, lastName: '' })) }} className={fieldErrors.lastName ? 'border-destructive' : ''} />
              {fieldErrors.lastName && <p className="text-sm text-destructive mt-1">{fieldErrors.lastName}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })) }} className={fieldErrors.email ? 'border-destructive' : ''} />
            {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
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
              className="w-full p-2 border rounded-md bg-background transition-colors"
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
              className="w-full p-2 border rounded-md bg-background transition-colors"
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
              className="w-full p-2 border rounded-md bg-background transition-colors"
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

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
