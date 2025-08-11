'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, HandHeart, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreatePostModalProps {
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ onClose, onPostCreated }: CreatePostModalProps) {
  const [type, setType] = useState<'ask' | 'offer'>('ask');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [baseIcao, setBaseIcao] = useState('');
  const [whenTs, setWhenTs] = useState('');
  const [category, setCategory] = useState('');
  const [seats, setSeats] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'safety_pilot', label: 'Safety Pilot' },
    { value: 'cost_sharing', label: 'Cost Sharing' },
    { value: 'training_help', label: 'Training Help' },
    { value: 'social_flight', label: 'Social Flight' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim() || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/community-board/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          title: title.trim(),
          body: body.trim(),
          baseIcao: baseIcao.trim() || null,
          whenTs: whenTs || null,
          category,
          seats: seats ? parseInt(seats) : null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Post created successfully!');
        onPostCreated();
      } else {
        const error = await response.json();
        console.error('Post creation error:', error);
        toast.error(error.error || error.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'ask' ? (
              <HelpCircle className="h-5 w-5 text-blue-600" />
            ) : (
              <HandHeart className="h-5 w-5 text-green-600" />
            )}
            Create {type === 'ask' ? 'Ask' : 'Offer'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label>Post Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'ask' ? 'default' : 'outline'}
                onClick={() => setType('ask')}
                className="flex-1"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Ask for Help
              </Button>
              <Button
                type="button"
                variant={type === 'offer' ? 'default' : 'outline'}
                onClick={() => setType('offer')}
                className="flex-1"
              >
                <HandHeart className="h-4 w-4 mr-2" />
                Offer Help
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Brief description of your ${type === 'ask' ? 'request' : 'offer'}`}
              maxLength={100}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="body">Description *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Provide details about your ${type === 'ask' ? 'request' : 'offer'}...`}
              rows={4}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right">
              {body.length}/1000
            </div>
          </div>

          {/* Base ICAO */}
          <div className="space-y-2">
            <Label htmlFor="baseIcao">Base (ICAO Code)</Label>
            <Input
              id="baseIcao"
              value={baseIcao}
              onChange={(e) => setBaseIcao(e.target.value.toUpperCase())}
              placeholder="e.g., LSZH"
              maxLength={4}
            />
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="whenTs">When</Label>
            <Input
              id="whenTs"
              type="datetime-local"
              value={whenTs}
              onChange={(e) => setWhenTs(e.target.value)}
            />
          </div>

          {/* Seats (for offers) */}
          {type === 'offer' && (
            <div className="space-y-2">
              <Label htmlFor="seats">Available Seats</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                max="10"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="Number of available seats"
              />
            </div>
          )}

          {/* Action Buttons */}
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
              disabled={loading || !title.trim() || !body.trim() || !category}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
