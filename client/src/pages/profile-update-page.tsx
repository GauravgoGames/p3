
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, X } from 'lucide-react';

const profileBasicSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  proaceDisqusId: z.string().optional(),
});

const securitySchema = z.object({
  email: z.string().email("Invalid email format"),
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  securityCode: z.string().optional()
}).refine((data) => {
  if (data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileBasicFields = z.infer<typeof profileBasicSchema>;
type SecurityFields = z.infer<typeof securitySchema>;

export default function ProfileUpdatePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('profile');

  const basicForm = useForm<ProfileBasicFields>({
    resolver: zodResolver(profileBasicSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      proaceDisqusId: user?.proaceDisqusId || '',
    }
  });

  const securityForm = useForm<SecurityFields>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      securityCode: user?.securityCode || '',
    }
  });

  useEffect(() => {
    if (user) {
      basicForm.reset({
        displayName: user.displayName || '',
      });
      securityForm.reset({
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        securityCode: user.securityCode || '',
      });
    }
  }, [user, basicForm, securityForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileBasicFields) => {
      
      
      // First update basic profile info
      const profileRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          displayName: data.displayName,
          proaceDisqusId: data.proaceDisqusId 
        }),
        credentials: 'include'
      });

      
      
      if (!profileRes.ok) {
        const errorData = await profileRes.json();
        console.error('Profile update error:', errorData);
        throw new Error(errorData.message || 'Failed to update profile');
      }

      // If there's a new image, upload it separately
      if (imageFile) {
        
        const formData = new FormData();
        formData.append('image', imageFile);

        const imageRes = await fetch('/api/profile/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });

        if (!imageRes.ok) {
          const imageErrorData = await imageRes.json();
          console.error('Image upload error:', imageErrorData);
          throw new Error(imageErrorData.message || 'Failed to upload profile image');
        }
      }

      const result = await profileRes.json();
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async (data: SecurityFields) => {
      let response;
      
      // Update email separately if changed
      if (data.email !== user?.email) {
        
        const emailRes = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email }),
          credentials: 'include'
        });
        if (!emailRes.ok) {
          const errorData = await emailRes.json();
          console.error('Email update error:', errorData);
          throw new Error(errorData.message || 'Failed to update email');
        }
      }

      // Update security code if provided
      if (data.securityCode !== user?.securityCode) {
        
        const securityRes = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ securityCode: data.securityCode }),
          credentials: 'include'
        });
        if (!securityRes.ok) {
          const errorData = await securityRes.json();
          console.error('Security code update error:', errorData);
          throw new Error(errorData.message || 'Failed to update security code');
        }
      }

      // Update password if provided
      if (data.newPassword) {
        
        const passwordRes = await fetch('/api/profile/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          }),
          credentials: 'include'
        });
        
        if (!passwordRes.ok) {
          const errorData = await passwordRes.json();
          console.error('Password update error:', errorData);
          throw new Error(errorData.message || 'Failed to update password');
        }
        response = await passwordRes.json();
      }

      

      return response || { message: 'Security settings updated successfully' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: 'Success',
        description: 'Security settings updated successfully',
      });
      securityForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image must be smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select a valid image file',
          variant: 'destructive',
        });
        return;
      }
      
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      toast({
        title: 'Image selected',
        description: 'Click "Update Profile" to save your new profile picture',
      });
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // Reset the file input
    const fileInput = document.getElementById('profile-image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const onBasicSubmit = async (data: ProfileBasicFields) => {
    try {
      await updateProfileMutation.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation callbacks
    }
  };

  const onSecuritySubmit = async (data: SecurityFields) => {
    try {
      await updateSecurityMutation.mutateAsync(data);
    } catch (error) {
      // Error handled by mutation callbacks
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Update Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile Information</TabsTrigger>
              <TabsTrigger value="security">Security Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Form {...basicForm}>
                <form onSubmit={basicForm.handleSubmit(onBasicSubmit)} className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative group">
                      <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage 
                          src={imagePreview || user.profileImage || ''} 
                          alt={user.displayName || user.username} 
                        />
                        <AvatarFallback className="text-2xl">
                          {user.displayName?.[0] || user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Upload overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <label 
                          htmlFor="profile-image" 
                          className="cursor-pointer text-white text-center"
                        >
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs">Change Photo</span>
                        </label>
                      </div>
                      
                      {/* Camera icon button */}
                      <label 
                        htmlFor="profile-image" 
                        className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 shadow-lg border-2 border-white"
                      >
                        <Camera className="h-5 w-5" />
                      </label>
                      
                      {/* Remove image button */}
                      {(imagePreview || imageFile) && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg border-2 border-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>

                  {/* Image upload instructions */}
                  <div className="text-center mb-4">
                    <p className="text-sm text-neutral-600">
                      Click the camera icon or hover over your photo to change your profile picture
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Supported formats: JPG, PNG, GIF (max 5MB)
                    </p>
                  </div>

                  <FormField
                    control={basicForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={basicForm.control}
                    name="proaceDisqusId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proace/Disqus ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your Proace or Disqus ID (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="security">
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <FormField
                    control={securityForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={securityForm.control}
                    name="securityCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Code</FormLabel>
                        <FormControl>
                          <Input type="text" {...field} placeholder="Enter your security code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateSecurityMutation.isPending}
                  >
                    {updateSecurityMutation.isPending ? 'Updating...' : 'Update Security Settings'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
