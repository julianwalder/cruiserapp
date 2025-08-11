'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OptimizedAvatar } from '@/components/ui/optimized-avatar';
import { 
  Plus, 
  HelpCircle, 
  HandHeart, 
  Users, 
  Filter,
  Share2,
  MessageSquare,
  Clock,
  MapPin,
  UserPlus,
  Wifi,
  WifiOff
} from 'lucide-react';
import { CreatePostModal } from './CreatePostModal';
import { PostCard } from './PostCard';
import { InviteFriendsModal } from './InviteFriendsModal';
import { toast } from 'sonner';
import { websocketService } from '@/lib/websocket-service';
import { realtimeService } from '@/lib/realtime-service';

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

export function CommunityBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ask' | 'offer'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchPosts();
    setupWebSocket();
    
    return () => {
      websocketService.disconnect();
      realtimeService.disconnect();
    };
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        setPosts([]);
        return;
      }

      const response = await fetch('/api/community-board/posts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load posts:', errorData);
        toast.error(errorData.error || 'Failed to load posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    fetchPosts();
    toast.success('Post created successfully!');
  };

  const handleResponseSubmitted = (postId: string) => {
    // Update the response count for the specific post immediately
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, responseCount: post.responseCount + 1 }
          : post
      )
    );
    toast.success('Response submitted successfully!');
  };

  const handlePostStatusChanged = (postId: string, status: string) => {
    // Update the post status when a response is accepted
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, status: status as 'open' | 'matched' | 'expired' }
          : post
      )
    );
  };

  const setupWebSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Check if we're on Vercel (production)
    const isVercel = typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('cruiseraviation.com'));

    if (isVercel) {
      // Use polling-based real-time service for Vercel
      console.log('Using polling-based real-time service for Vercel deployment');
      realtimeService.connect(token);
      
      const unsubscribePostCreated = realtimeService.subscribe('post_created', (data) => {
        setPosts(prevPosts => [data, ...prevPosts]);
      });

      const unsubscribeResponseCreated = realtimeService.subscribe('response_created', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.postId 
              ? { ...post, responseCount: post.responseCount + 1 }
              : post
          )
        );
      });

      const unsubscribePostUpdated = realtimeService.subscribe('post_updated', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.id ? { ...post, ...data } : post
          )
        );
      });

      const unsubscribePostDeleted = realtimeService.subscribe('post_deleted', (data) => {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== data.id));
      });

      const unsubscribePostExpired = realtimeService.subscribe('post_expired', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.id ? { ...post, status: 'expired' } : post
          )
        );
      });

      // Update connection status
      const checkConnection = () => {
        setIsConnected(realtimeService.isConnectedState());
      };

      const interval = setInterval(checkConnection, 1000);

      return () => {
        unsubscribePostCreated();
        unsubscribeResponseCreated();
        unsubscribePostUpdated();
        unsubscribePostDeleted();
        unsubscribePostExpired();
        clearInterval(interval);
        realtimeService.disconnect();
      };
    } else {
      // Use WebSocket service for local development
      console.log('Using WebSocket service for local development');
      try {
        websocketService.connect(token);
      } catch (error) {
        console.warn('WebSocket connection failed (server may not be running):', error);
      }

      const unsubscribePostCreated = websocketService.subscribe('post_created', (data) => {
        setPosts(prevPosts => [data, ...prevPosts]);
      });

      const unsubscribeResponseCreated = websocketService.subscribe('response_created', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.postId 
              ? { ...post, responseCount: post.responseCount + 1 }
              : post
          )
        );
      });

      const unsubscribePostUpdated = websocketService.subscribe('post_updated', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.id ? { ...post, ...data } : post
          )
        );
      });

      const unsubscribePostDeleted = websocketService.subscribe('post_deleted', (data) => {
        setPosts(prevPosts => prevPosts.filter(post => post.id !== data.id));
      });

      const unsubscribePostExpired = websocketService.subscribe('post_expired', (data) => {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === data.id ? { ...post, status: 'expired' } : post
          )
        );
      });

      const checkConnection = () => {
        setIsConnected(websocketService.isConnectedState());
      };

      const interval = setInterval(checkConnection, 1000);

      return () => {
        unsubscribePostCreated();
        unsubscribeResponseCreated();
        unsubscribePostUpdated();
        unsubscribePostDeleted();
        unsubscribePostExpired();
        clearInterval(interval);
      };
    }
  }, []);

  const filteredPosts = posts.filter(post => {
    if (filter !== 'all' && post.type !== filter) return false;
    if (categoryFilter !== 'all' && post.category !== categoryFilter) return false;
    return true;
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'safety_pilot', label: 'Safety Pilot' },
    { value: 'cost_sharing', label: 'Cost Sharing' },
    { value: 'training_help', label: 'Training Help' },
    { value: 'social_flight', label: 'Social Flight' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Ask for Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Need help with a flight, safety pilot, or training?
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ask
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-green-600" />
              Offer Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share your skills, offer a seat, or help others?
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Offer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Invite Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Grow the community by inviting fellow pilots
            </p>
            <Button 
              onClick={() => setShowInviteModal(true)}
              className="w-full"
              variant="outline"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Invite Friends
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filter:</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All Posts
                </Button>
                <Button
                  variant={filter === 'ask' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('ask')}
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Asks
                </Button>
                <Button
                  variant={filter === 'offer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('offer')}
                >
                  <HandHeart className="h-4 w-4 mr-1" />
                  Offers
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 text-xs ${
                isConnected ? 'text-green-600' : 'text-red-600'
              }`}>
                {isConnected ? (
                  <Wifi className="h-3 w-3" />
                ) : (
                  <WifiOff className="h-3 w-3" />
                )}
                <span>{isConnected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No posts found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {filter === 'all' && categoryFilter === 'all' 
                  ? 'Be the first to create a post and start connecting with the community!'
                  : 'No posts match your current filters. Try adjusting your search criteria.'
                }
              </p>
              {filter === 'all' && categoryFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              onResponseSubmitted={handleResponseSubmitted}
              onPostStatusChanged={handlePostStatusChanged}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {showInviteModal && (
        <InviteFriendsModal
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
