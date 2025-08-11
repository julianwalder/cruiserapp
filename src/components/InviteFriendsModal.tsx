'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface InviteFriendsModalProps {
  onClose: () => void;
}

export function InviteFriendsModal({ onClose }: InviteFriendsModalProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if native sharing is available
    setCanShare(!!navigator.share);
    fetchInviteCode();
  }, []);



  const fetchInviteCode = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/community-board/invite', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.inviteCode);
        setInviteUrl(`${window.location.origin}/invite/${data.inviteCode}`);
        toast.success('Invite code generated successfully!');
      } else {
        const error = await response.json();
        console.error('Invite code generation error:', error);
        toast.error(error.error || error.message || 'Failed to generate invite code');
      }
    } catch (error) {
      console.error('Error fetching invite code:', error);
      toast.error('Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setCopied(true);
          toast.success('Copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          toast.error('Failed to copy to clipboard. Please copy manually.');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join our Aviation Community',
          text: 'I\'m inviting you to join our aviation community where pilots can ask for help, offer support, and connect with fellow aviators.',
          url: inviteUrl,
        });
        // If we reach here, sharing was successful
        toast.success('Shared successfully!');
      } catch (error: any) {
        // Check if it's a user cancellation (which is not an error)
        if (error.name === 'AbortError' || error.message?.includes('canceled')) {
          // User canceled the share - this is normal behavior
          console.log('Share was canceled by user');
          return;
        }
        // Actual error occurred
        console.error('Error sharing:', error);
        toast.error('Failed to share. Copying to clipboard instead.');
        copyToClipboard(inviteUrl);
      }
    } else {
      copyToClipboard(inviteUrl);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Invite Friends
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Share your personal invite link with fellow pilots to grow our community
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Invite Code */}
              <div className="space-y-2">
                <Label>Your Invite Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteCode}
                    readOnly
                    className="font-mono text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(inviteCode)}
                    disabled={copied}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Invite URL */}
              <div className="space-y-2">
                <Label>Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(inviteUrl)}
                    disabled={copied}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Share Button */}
              <Button
                onClick={shareInvite}
                className="w-full"
                size="lg"
              >
                <Share2 className="h-4 w-4 mr-2" />
                {canShare ? 'Share Invite' : 'Copy Link'}
              </Button>
              {!canShare && (
                <p className="text-xs text-gray-500 text-center">
                  Native sharing not available - will copy to clipboard
                </p>
              )}

              {/* Stats */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Community Stats
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Total Members</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Growing daily
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Active Posts</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Check the board
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Tips for inviting friends
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Share with fellow pilots and aviation enthusiasts</li>
                  <li>• Post on aviation forums and social media groups</li>
                  <li>• Include a personal message about why they should join</li>
                  <li>• Encourage them to create their first post</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
