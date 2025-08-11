'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { 
  HelpCircle, 
  HandHeart, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorAvatarUrl?: string;
  responseCount: number;
}

interface Response {
  id: string;
  postId: string;
  responderId: string;
  message?: string;
  status: 'proposed' | 'accepted' | 'rejected';
  createdAt: string;
  responderFirstName: string;
  responderLastName: string;
  responderAvatarUrl?: string;
}

interface ViewResponsesModalProps {
  post: Post;
  onClose: () => void;
  onResponseStatusChanged?: (responseId: string, status: 'accepted' | 'rejected') => void;
}

export function ViewResponsesModal({ post, onClose, onResponseStatusChanged }: ViewResponsesModalProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchResponses();
  }, [post.id]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/community-board/responses?postId=${post.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses || []);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to fetch responses');
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error('Failed to fetch responses');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (responseId: string, status: 'accepted' | 'rejected') => {
    try {
      setUpdatingStatus(responseId);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/community-board/responses/${responseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Update local state
        setResponses(prev => 
          prev.map(r => 
            r.id === responseId 
              ? { ...r, status }
              : r
          )
        );
        
        // Update post status to matched if any response is accepted
        if (status === 'accepted') {
          // You might want to update the post status here
        }
        
        toast.success(`Response ${status}`);
        onResponseStatusChanged?.(responseId, status);
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${status} response`);
      }
    } catch (error) {
      console.error('Error updating response status:', error);
      toast.error(`Failed to ${status} response`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'proposed':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Proposed</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-600 border-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {post.type === 'ask' ? (
              <HelpCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <HandHeart className="h-5 w-5 text-green-600" />
            )}
            Responses to "{post.title}"
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

          {/* Responses */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No responses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your post hasn't received any responses yet. Keep it open and check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <OptimizedAvatar
                        src={response.responderAvatarUrl}
                        alt={`${response.responderFirstName} ${response.responderLastName}`}
                        fallback={`${response.responderFirstName.charAt(0)}${response.responderLastName.charAt(0)}`}
                        className="h-10 w-10"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {response.responderFirstName} {response.responderLastName}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(response.createdAt)}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(response.status)}
                  </div>

                  {response.message && (
                    <div className="mb-4">
                      <p className="text-gray-700 dark:text-gray-300">
                        {response.message}
                      </p>
                    </div>
                  )}

                  {response.status === 'proposed' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(response.id, 'accepted')}
                        disabled={updatingStatus === response.id}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(response.id, 'rejected')}
                        disabled={updatingStatus === response.id}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
