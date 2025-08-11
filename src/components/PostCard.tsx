'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { 
  HelpCircle, 
  HandHeart, 
  MessageSquare, 
  Clock, 
  MapPin, 
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ResponseModal } from './ResponseModal';
import { ViewResponsesModal } from './ViewResponsesModal';
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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onResponseSubmitted: (postId: string) => void;
  onPostStatusChanged?: (postId: string, status: string) => void;
}

export function PostCard({ post, currentUser, onResponseSubmitted, onPostStatusChanged }: PostCardProps) {
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showViewResponsesModal, setShowViewResponsesModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isOwnPost = currentUser?.id === post.authorId; // We need to add authorId to the Post interface

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      safety_pilot: 'Safety Pilot',
      cost_sharing: 'Cost Sharing',
      training_help: 'Training Help',
      social_flight: 'Social Flight',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      safety_pilot: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      cost_sharing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      training_help: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      social_flight: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <OptimizedAvatar
                src={post.authorAvatarUrl}
                alt={`${post.authorFirstName} ${post.authorLastName}`}
                fallback={`${post.authorFirstName[0]}${post.authorLastName[0]}`}
                className="h-10 w-10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {post.authorFirstName} {post.authorLastName}
                  </h3>
                  {isOwnPost && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  {formatDate(post.createdAt)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {post.type === 'ask' ? (
                <HelpCircle className="h-5 w-5 text-blue-600" />
              ) : (
                <HandHeart className="h-5 w-5 text-green-600" />
              )}
              <Badge className={getCategoryColor(post.category)}>
                {getCategoryLabel(post.category)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {post.title}
            </h4>
            
            <div className="text-gray-600 dark:text-gray-400">
              {expanded ? (
                <div className="whitespace-pre-wrap">{post.body}</div>
              ) : (
                <div>
                  {post.body.length > 200 
                    ? `${post.body.substring(0, 200)}...` 
                    : post.body
                  }
                </div>
              )}
              
              {post.body.length > 200 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-700"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Post Details */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {post.baseIcao && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {post.baseIcao}
              </div>
            )}
            
            {post.whenTs && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(post.whenTs)}
              </div>
            )}
            
            {post.seats && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {post.seats} seat{post.seats !== 1 ? 's' : ''} available
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MessageSquare className="h-4 w-4" />
                {post.responseCount} response{post.responseCount !== 1 ? 's' : ''}
              </div>
            </div>
            
            {!isOwnPost && post.status === 'open' && (
              <Button
                onClick={() => setShowResponseModal(true)}
                size="sm"
                className="ml-auto"
              >
                {post.type === 'ask' ? 'I Can Help' : 'I\'m Interested'}
              </Button>
            )}
            
            {isOwnPost && post.status === 'open' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Open
                </Badge>
                {post.responseCount > 0 && (
                  <Button
                    onClick={() => setShowViewResponsesModal(true)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Responses ({post.responseCount})
                  </Button>
                )}
              </div>
            )}
            
            {post.status === 'matched' && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Matched
                </Badge>
                {isOwnPost && post.responseCount > 0 && (
                  <Button
                    onClick={() => setShowViewResponsesModal(true)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    View Responses ({post.responseCount})
                  </Button>
                )}
              </div>
            )}
            
            {post.status === 'expired' && (
              <Badge variant="outline" className="text-gray-600 border-gray-600">
                Expired
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {showResponseModal && (
        <ResponseModal
          post={post}
          onClose={() => setShowResponseModal(false)}
          onResponseSubmitted={onResponseSubmitted}
        />
      )}

      {showViewResponsesModal && (
        <ViewResponsesModal
          post={post}
          onClose={() => setShowViewResponsesModal(false)}
          onResponseStatusChanged={(responseId, status) => {
            // Update the post status if a response was accepted
            if (status === 'accepted') {
              onPostStatusChanged?.(post.id, 'matched');
            }
          }}
        />
      )}
    </>
  );
}
