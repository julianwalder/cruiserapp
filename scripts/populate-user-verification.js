#!/usr/bin/env node

/**
 * Populate User Verification Data Script
 * 
 * This script helps populate verification data for specific users
 * by searching for their verifications in Veriff.
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

class UserVerificationPopulator {
  generateSignature(payloadString) {
    const hmac = crypto.createHmac('sha256', VERIFF_API_SECRET);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  async findUserByEmail(email) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, "firstName", "lastName", email, veriffSessionId, veriffVerificationId, veriffStatus')
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

  async populateUserByEmail(email) {
    console.log(`\n🔧 Looking for user: ${email}`);
    console.log('=====================================');

    // Find the user
    const user = await this.findUserByEmail(email);
    if (!user) {
      console.log(`❌ No user found with email: ${email}`);
      return false;
    }

    console.log(`👤 Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Current session ID: ${user.veriffSessionId || 'Not set'}`);
    console.log(`   Current verification ID: ${user.veriffVerificationId || 'Not set'}`);
    console.log(`   Current status: ${user.veriffStatus || 'Not set'}`);

    // If user already has a verification ID, try to populate it
    if (user.veriffVerificationId) {
      console.log(`\n🎯 User has verification ID: ${user.veriffVerificationId}`);
      const verificationData = await this.fetchVerificationDetails(user.veriffVerificationId);
      
      if (verificationData) {
        const success = await this.updateUserVerificationData(user.id, verificationData);
        if (success) {
          console.log(`🎉 Successfully populated verification data for ${user.firstName} ${user.lastName}`);
          console.log(`   Status: ${verificationData.status}`);
          console.log(`   Document: ${verificationData.document?.type || 'Not specified'}`);
          if (verificationData.decisionScore !== undefined) {
            console.log(`   Decision Score: ${(verificationData.decisionScore * 100).toFixed(1)}%`);
          }
          return true;
        }
      }
    }

    // If no verification ID or failed to populate, provide guidance
    console.log(`\n❌ No verification data found for ${user.firstName} ${user.lastName}`);
    console.log('\n💡 To populate verification data, you need:');
    console.log('1. The verification ID from Veriff dashboard');
    console.log('2. Or the session ID from when the verification was created');
    console.log('\n📋 You can:');
    console.log(`   - Check Veriff dashboard for verifications with email: ${email}`);
    console.log(`   - Use: node scripts/populate-specific-verification.js <verification_id>`);
    console.log(`   - Or provide the verification ID and I can help populate it`);

    return false;
  }
}

async function main() {
  console.log('🔧 User Verification Data Population Tool');
  console.log('==========================================\n');

  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/populate-user-verification.js <email>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/populate-user-verification.js giandipinto@gmail.com');
    console.log('  node scripts/populate-user-verification.js user@example.com');
    process.exit(1);
  }

  const email = args[0];
  const populator = new UserVerificationPopulator();
  
  try {
    await populator.populateUserByEmail(email);
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