import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Upload, Calendar, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface TournamentFormData {
  name: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isContest?: boolean;
}

// CONTEST FEATURE IMPLEMENTATION - VERSION 2.0
export default function AdminAddTournament() {
  const [formData, setFormData] = useState<TournamentFormData>({
    name: '',
    description: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    isContest: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload image');
      return response.json();
    },
  });

  const createTournamentMutation = useMutation({
    mutationFn: async (data: TournamentFormData) => {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create tournament');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tournaments'] });
      toast({
        title: "Tournament Created",
        description: "The tournament has been created successfully.",
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        startDate: '',
        endDate: '',
        isContest: false,
      });
      setImageFile(null);
      setImagePreview('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create tournament. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let imageUrl = formData.imageUrl;
    
    // Upload image if a file was selected
    if (imageFile) {
      try {
        const uploadResult = await uploadImageMutation.mutateAsync(imageFile);
        imageUrl = uploadResult.url;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    createTournamentMutation.mutate({
      ...formData,
      imageUrl,
    });
  };

  const isLoading = createTournamentMutation.isPending || uploadImageMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Add New Tournament
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tournament Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. IPL 2025"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the tournament..."
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Tournament Image</Label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  
                  {imagePreview && (
                    <div className="border rounded-lg p-2">
                      <img
                        src={imagePreview}
                        alt="Tournament preview"
                        className="w-full h-48 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Contest Toggle - Premium Feature */}
              <div className="space-y-3 border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <Label className="text-base font-semibold text-yellow-800">Premium Contest Tournament</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="isContest"
                    checked={formData.isContest || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, isContest: !!checked })}
                    className="border-yellow-400 data-[state=checked]:bg-yellow-600"
                  />
                  <Label htmlFor="isContest" className="text-sm font-medium cursor-pointer text-yellow-800">
                    Enable Contest Mode (Exclusive Premium Feature)
                  </Label>
                </div>
                {formData.isContest && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Contest Features:</strong><br />
                      • Awards 2 points for correct match predictions<br />
                      • No toss predictions available<br />
                      • Admin can control participant access
                    </p>
                  </div>
                )}
              </div>

              {/* Contest Toggle - VISIBLE HERE */}
              <div className="mb-6 p-4 border-4 border-red-500 bg-red-100 rounded-lg">
                <h3 className="text-lg font-bold text-red-800 mb-3">CONTEST TOURNAMENT OPTION</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="contestCheckbox"
                    checked={formData.isContest || false}
                    onChange={(e) => setFormData({ ...formData, isContest: e.target.checked })}
                    className="w-6 h-6"
                  />
                  <label htmlFor="contestCheckbox" className="text-red-800 font-semibold text-lg">
                    Make this a Premium Contest Tournament
                  </label>
                </div>
                {formData.isContest && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-400 rounded">
                    <p className="text-green-800 font-medium">
                      Contest Mode Enabled: 2x points for match predictions, no toss predictions
                    </p>
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* TEST CONTEST SECTION - THIS SHOULD BE VISIBLE */}
              <div style={{ 
                border: '5px solid red', 
                padding: '20px', 
                margin: '20px 0', 
                backgroundColor: 'yellow' 
              }}>
                <h2 style={{ color: 'red', fontSize: '24px', fontWeight: 'bold' }}>
                  CONTEST CHECKBOX TEST
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    id="testContest"
                    checked={formData.isContest || false}
                    onChange={(e) => setFormData({ ...formData, isContest: e.target.checked })}
                    style={{ width: '30px', height: '30px' }}
                  />
                  <label htmlFor="testContest" style={{ fontSize: '18px', fontWeight: 'bold', color: 'red' }}>
                    Make this tournament a CONTEST (Premium Feature)
                  </label>
                </div>
                {formData.isContest && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    backgroundColor: 'lime', 
                    border: '2px solid green' 
                  }}>
                    <p style={{ color: 'green', fontWeight: 'bold' }}>
                      ✅ CONTEST MODE ENABLED! This tournament will have 2x points and no toss predictions.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                  {isLoading ? 'Creating...' : 'Create Tournament'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      name: '',
                      description: '',
                      imageUrl: '',
                      startDate: '',
                      endDate: '',
                      isContest: false,
                    });
                    setImageFile(null);
                    setImagePreview('');
                  }}
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}