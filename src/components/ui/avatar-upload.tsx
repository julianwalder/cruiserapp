'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { 
  Upload, 
  Camera, 
  X, 
  Loader2,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarChange: (url: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  userName?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  onAvatarChange,
  className,
  size = 'md',
  disabled = false,
  userName
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-20 w-20',
    lg: 'h-24 w-24'
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please select a JPEG, PNG, GIF, or WebP image.'
      });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: 'Please select an image smaller than 5MB.'
      });
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/avatar/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call the callback with the new avatar URL
      onAvatarChange(data.url);

      toast.success('Avatar updated successfully!', {
        description: 'Your profile picture has been updated.'
      });

    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'An error occurred while uploading.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Call API to remove avatar
      const response = await fetch('/api/avatar/remove', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove avatar');
      }

      onAvatarChange('');
      toast.success('Avatar removed successfully!');
      setShowRemoveDialog(false);

    } catch (error) {
      console.error('Avatar removal error:', error);
      toast.error('Failed to remove avatar', {
        description: error instanceof Error ? error.message : 'An error occurred.'
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return <User className="h-6 w-6" />;
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={cn("relative group", className)}>
      {/* Avatar Display */}
              <OptimizedAvatar
          src={displayUrl}
          alt="Profile picture"
          fallback={userName}
          className={cn(sizeClasses[size], "border-2 border-border cursor-pointer")}
          size={size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'xl'}
        />

      {/* Upload Overlay with Edit Text */}
      {!disabled && (
        <div 
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <Camera className="h-6 w-6 text-white mx-auto mb-1" />
            <span className="text-white text-xs font-medium">Edit</span>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}

      {/* Preview Actions */}
      {previewUrl && !isUploading && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <Button
            size="sm"
            onClick={handleUpload}
            className="h-8 w-8 p-0 rounded-full"
            title="Upload"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="h-8 w-8 p-0 rounded-full"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Remove Avatar - Hidden by default, shown on hover */}
      {currentAvatarUrl && !previewUrl && !isUploading && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRemoveDialog(true)}
            className="h-6 w-6 p-0 rounded-full shadow-lg"
            title="Remove avatar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Remove Avatar Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Profile Picture</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile picture? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveAvatar}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 