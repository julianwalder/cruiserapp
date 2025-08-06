#!/usr/bin/env node

/**
 * Populate Specific Verification Data Script
 * 
 * This script populates verification data for specific verification IDs or users.
 * Useful for testing or populating data for specific cases.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERIFF_API_KEY = process.env.VERIFF_API_KEY;
const VERIFF_API_SECRET = process.env.VERIFF_API_SECRET;
const VERIFF_BASE_URL = process.env.VERIFF_BASE_URL || 'https://api.veriff.me/v1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

if (!VERIFF_API_KEY || !VERIFF_API_SECRET) {
  console.error('❌ Missing Veriff API credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class SpecificVeriffPopulator {
  generateSignature(payloadString) {
    const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  async fetchVerificationDetails(verificationId) {
    try {
      console.log(`📥 Fetching verification details for ${verificationId}...`);
      
      const response = await fetch(`${VERIFF_BASE_URL}/verifications/${verificationId}`, {
        method: 'GET',
        headers: {
          'X-AUTH-CLIENT': VERIFF_API_KEY,
          'X-HMAC-SIGNATURE': this.generateSignature(''),
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Verification ${verificationId} not found (404)`);
          return null;
        }
        throw new Error(`Veriff API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched verification data for ${verificationId}`);
      return data;
    } catch (error) {
      console.error(`Error fetching verification ${verificationId}:`, error);
      return null;
    }
  }

  async findUserByVerificationId(verificationId) {
    try {
      // First try to find by session ID
      const { data: user, error } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('veriffSessionId', verificationId)
        .single();

      if (user) {
        return user;
      }

      // If not found, try to find by verification ID
      const { data: user2, error: error2 } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('veriffVerificationId', verificationId)
        .single();

      if (user2) {
        return user2;
      }

      return null;
    } catch (error) {
      console.error('Error finding user by verification ID:', error);
      return null;
    }
  }

  async findUserByEmail(email) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('email', email)
        .single();

      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  async updateUserVerificationData(userId, verificationData) {
    try {
      console.log(`🔄 Updating user ${userId} with verification data...`);
      
      const updateData = {
        veriffWebhookData: verificationData,
        veriffWebhookReceivedAt: new Date().toISOString(),
        veriffVerificationId: verificationData.id,
        veriffSessionId: verificationData.id,
        veriffStatus: verificationData.status,
        veriffUpdatedAt: new Date().toISOString(),
      };

      // Extract person data
      if (verificationData.person) {
        updateData.veriffPersonGivenName = verificationData.person.givenName;
        updateData.veriffPersonLastName = verificationData.person.lastName;
        updateData.veriffPersonIdNumber = verificationData.person.idNumber;
        updateData.veriffPersonDateOfBirth = verificationData.person.dateOfBirth ? new Date(verificationData.person.dateOfBirth) : null;
        updateData.veriffPersonNationality = verificationData.person.nationality;
        updateData.veriffPersonGender = verificationData.person.gender;
        updateData.veriffPersonCountry = verificationData.person.country;
      }

      // Extract document data
      if (verificationData.document) {
        updateData.veriffDocumentType = verificationData.document.type;
        updateData.veriffDocumentNumber = verificationData.document.number;
        updateData.veriffDocumentCountry = verificationData.document.country;
        updateData.veriffDocumentValidFrom = verificationData.document.validFrom ? new Date(verificationData.document.validFrom) : null;
        updateData.veriffDocumentValidUntil = verificationData.document.validUntil ? new Date(verificationData.document.validUntil) : null;
        updateData.veriffDocumentIssuedBy = verificationData.document.issuedBy;
      }

      // Extract face verification data
      if (verificationData.additionalVerification?.faceMatch) {
        updateData.veriffFaceMatchSimilarity = verificationData.additionalVerification.faceMatch.similarity;
        updateData.veriffFaceMatchStatus = verificationData.additionalVerification.faceMatch.status;
      }

      // Extract decision and insights
      if (verificationData.decisionScore !== undefined) {
        updateData.veriffDecisionScore = verificationData.decisionScore;
      }
      if (verificationData.insights) {
        updateData.veriffQualityScore = verificationData.insights.quality;
        updateData.veriffFlags = verificationData.insights.flags;
        updateData.veriffContext = verificationData.insights.context;
      }

      // Set verification status
      if (verificationData.status === 'approved') {
        updateData.identityVerified = true;
        updateData.veriffApprovedAt = verificationData.updatedAt || new Date().toISOString();
      } else if (verificationData.status === 'declined') {
        updateData.identityVerified = false;
        updateData.veriffDeclinedAt = verificationData.updatedAt || new Date().toISOString();
      } else if (verificationData.status === 'submitted') {
        updateData.veriffSubmittedAt = verificationData.updatedAt || new Date().toISOString();
      }

      // Set timestamps
      if (verificationData.createdAt) {
        updateData.veriffCreatedAt = new Date(verificationData.createdAt);
      }
      if (verificationData.updatedAt) {
        updateData.veriffUpdatedAt = new Date(verificationData.updatedAt);
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error(`Error updating user ${userId}:`, error);
        return false;
      }

      console.log(`✅ Successfully updated user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error updating user verification data for ${userId}:`, error);
      return false;
    }
  }

  async populateVerification(verificationId) {
    console.log(`\n🔧 Processing verification: ${verificationId}`);
    console.log('=====================================');

    // Fetch verification details from Veriff
    const verificationData = await this.fetchVerificationDetails(verificationId);
    if (!verificationData) {
      console.log(`❌ Could not fetch verification data for ${verificationId}`);
      return false;
    }

    // Try to find the user
    let user = await this.findUserByVerificationId(verificationId);
    
    if (!user && verificationData.person?.email) {
      console.log(`🔍 Looking for user by email: ${verificationData.person.email}`);
      user = await this.findUserByEmail(verificationData.person.email);
    }

    if (!user) {
      console.log(`❌ No matching user found for verification ${verificationId}`);
      console.log('Available data:');
      console.log(`  - Person email: ${verificationData.person?.email || 'Not available'}`);
      console.log(`  - Person name: ${verificationData.person?.givenName} ${verificationData.person?.lastName}`);
      return false;
    }

    console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Update user with verification data
    const success = await this.updateUserVerificationData(user.id, verificationData);
    
    if (success) {
      console.log(`🎉 Successfully populated verification data for ${user.firstName} ${user.lastName}`);
      console.log(`   Status: ${verificationData.status}`);
      console.log(`   Document: ${verificationData.document?.type || 'Not specified'}`);
      if (verificationData.decisionScore !== undefined) {
        console.log(`   Decision Score: ${(verificationData.decisionScore * 100).toFixed(1)}%`);
      }
    } else {
      console.log(`❌ Failed to populate verification data for ${user.firstName} ${user.lastName}`);
    }

    return success;
  }

  async populateByEmail(email) {
    console.log(`\n🔧 Looking for verifications by email: ${email}`);
    console.log('=====================================');

    // First find the user
    const user = await this.findUserByEmail(email);
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return false;
    }

    console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);

    // Check if user already has verification data
    const { data: existingData } = await supabase
      .from('users')
      .select('veriffVerificationId, veriffStatus, identityVerified')
      .eq('id', user.id)
      .single();

    if (existingData?.veriffVerificationId) {
      console.log(`📋 User already has verification data:`);
      console.log(`   Verification ID: ${existingData.veriffVerificationId}`);
      console.log(`   Status: ${existingData.veriffStatus}`);
      console.log(`   Verified: ${existingData.identityVerified ? 'Yes' : 'No'}`);
      
      const update = await this.populateVerification(existingData.veriffVerificationId);
      return update;
    } else {
      console.log(`❌ No existing verification data found for this user`);
      return false;
    }
  }
}

async function main() {
  console.log('🔧 Specific Veriff Data Population Tool');
  console.log('=======================================\n');

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/populate-specific-verification.js <verification_id>');
    console.log('  node scripts/populate-specific-verification.js --email <email>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/populate-specific-verification.js 12345678-1234-1234-1234-123456789012');
    console.log('  node scripts/populate-specific-verification.js --email user@example.com');
    process.exit(1);
  }

  const populator = new SpecificVeriffPopulator();
  
  try {
    if (args[0] === '--email' && args[1]) {
      await populator.populateByEmail(args[1]);
    } else {
      await populator.populateVerification(args[0]);
    }
  } catch (error) {
    console.error('❌ Population failed:', error);
    process.exit(1);
  }
}

// Run the population
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 