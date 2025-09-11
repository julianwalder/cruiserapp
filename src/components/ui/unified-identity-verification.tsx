'use client';

import React from 'react';
import { StripeIdentityVerification } from './stripe-identity-verification';

interface UnifiedIdentityVerificationProps {
  userId: string;
  userData: {
    firstName: string;
    lastName: string;
    email: string;
  };
  onStatusChange?: (status: string) => void;
  className?: string;
}

export function UnifiedIdentityVerification(props: UnifiedIdentityVerificationProps) {
  // Always use Stripe Identity - clean, simple integration
  return <StripeIdentityVerification {...props} />;
}
