const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDaiaAddress() {
  console.log('🔍 Checking Alexandru-Ștefan Daia address data...');
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      firstName,
      lastName,
      veriffStatus,
      veriffWebhookData,
      veriffPersonCountry,
      address,
      city,
      state,
      zipCode,
      country
    `)
    .eq('email', 'ops@cruiseraviation.ro')
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📋 User Info:');
  console.log('Email:', user.email);
  console.log('Name:', user.firstName, user.lastName);
  console.log('Veriff Status:', user.veriffStatus);
  console.log('');
  
  console.log('🏠 Address Fields:');
  console.log('Address:', user.address);
  console.log('City:', user.city);
  console.log('State:', user.state);
  console.log('Zip Code:', user.zipCode);
  console.log('Country:', user.country);
  console.log('Veriff Person Country:', user.veriffPersonCountry);
  console.log('');
  
  console.log('📄 Veriff Webhook Data:');
  if (user.veriffWebhookData) {
    console.log('Has webhook data:', !!user.veriffWebhookData);
    
    // Check for address in webhook data
    if (user.veriffWebhookData.person?.address) {
      console.log('✅ Person Address:', user.veriffWebhookData.person.address);
    }
    
    if (user.veriffWebhookData.address) {
      console.log('✅ Direct Address:', user.veriffWebhookData.address);
    }
    
    // Look for any address-related fields
    const webhookKeys = Object.keys(user.veriffWebhookData);
    console.log('Webhook data keys:', webhookKeys);
    
    webhookKeys.forEach(key => {
      if (key.toLowerCase().includes('address')) {
        console.log(`Address field '${key}':`, user.veriffWebhookData[key]);
      }
    });
    
    // Check person object
    if (user.veriffWebhookData.person) {
      console.log('Person object keys:', Object.keys(user.veriffWebhookData.person));
      if (user.veriffWebhookData.person.address) {
        console.log('Person address:', user.veriffWebhookData.person.address);
      }
    }
    
    // Check document object
    if (user.veriffWebhookData.document) {
      console.log('Document object keys:', Object.keys(user.veriffWebhookData.document));
    }
  } else {
    console.log('❌ No webhook data found');
  }
  
  process.exit(0);
}

checkDaiaAddress().catch(console.error);
