'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle, HandHeart } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  type: 'ask' | 'offer';
  title: string;
  body: string;
  baseIcao?: string;
  whenTs?: string;
  category: string;
  seats?: number;
  status: 'open' | 'matched' | 'expired';
  expiresAt: string;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl?: string;
  responseCount: number;
}

interface ResponseModalProps {
  post: Post;
  onClose: () => void;
  onResponseSubmitted: (postId: string) => void;
}

export function ResponseModal({ post, onClose, onResponseSubmitted }: ResponseModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/community-board/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: post.id,
          message: message.trim() || null,
        }),
      });

      if (response.ok) {
        onResponseSubmitted(post.id);
        onClose();
        toast.success('Response submitted successfully!');
      } else {
        let errorMessage = 'Failed to submit response';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          // If we can't parse JSON, try to get text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (textError) {
            console.error('Failed to get error text:', textError);
          }
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {post.type === 'ask' ? (
              <HelpCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <HandHeart className="h-5 w-5 text-green-600" />
            )}
            Respond to {post.type === 'ask' ? 'Ask' : 'Offer'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {post.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              by {post.authorFirstName} {post.authorLastName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {post.body.length > 150 
                ? `${post.body.substring(0, 150)}...` 
                : post.body
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">
                Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Add a message to your response...`}
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 text-right">
                {message.length}/500
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Submitting...' : `Submit Response`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
