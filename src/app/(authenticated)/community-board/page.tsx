'use client';

import { useState, useEffect } from 'react';
import { CommunityBoard } from '@/components/CommunityBoard';

export default function CommunityBoardPage() {
  return (
    <div className="space-y-6 mt-6">
      <CommunityBoard />
    </div>
  );
}
