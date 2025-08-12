const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateNotifications() {
  try {
    console.log('🔧 Starting notifications population...\n');

    // First, let's create some sample notifications for different users
    console.log('📝 Creating sample notifications...');

    // Get some users to create notifications for
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, "firstName", "lastName"')
      .eq('status', 'ACTIVE')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} users to create notifications for`);

    // Sample notifications data
    const sampleNotifications = [
      {
        title: 'Welcome to Cruiser Aviation',
        message: 'Welcome to our flight management system! We\'re excited to have you on board.',
        type: 'system'
      },
      {
        title: 'Flight Log Approved',
        message: 'Your recent flight log has been approved by your instructor.',
        type: 'flight'
      },
      {
        title: 'Payment Received',
        message: 'Payment of €150.00 for your flight hours package has been received.',
        type: 'billing'
      },
      {
        title: 'Aircraft Maintenance',
        message: 'Aircraft C-152 (D-EFGH) is scheduled for maintenance tomorrow.',
        type: 'fleet'
      },
      {
        title: 'Weather Alert',
        message: 'Strong winds expected in the area. Check weather conditions before flight.',
        type: 'weather'
      },
      {
        title: 'System Update',
        message: 'System maintenance will occur tonight at 2:00 AM. Expect brief downtime.',
        type: 'system'
      },
      {
        title: 'New Flight Hours Package',
        message: 'A new 10-hour package is now available at a discounted rate.',
        type: 'billing'
      },
      {
        title: 'Flight Schedule Reminder',
        message: 'You have a scheduled flight tomorrow at 10:00 AM.',
        type: 'flight'
      }
    ];

    // Create notifications for each user
    let createdCount = 0;
    for (const user of users) {
      // Create 3-6 random notifications for each user
      const numNotifications = Math.floor(Math.random() * 4) + 3;
      const userNotifications = [];
      
      for (let i = 0; i < numNotifications; i++) {
        const notification = sampleNotifications[Math.floor(Math.random() * sampleNotifications.length)];
        const isRead = Math.random() > 0.6; // 40% chance of being unread
        
        userNotifications.push({
          user_id: user.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: isRead,
          is_deleted: false,
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 7 days
          read_at: isRead ? new Date().toISOString() : null,
          deleted_at: null
        });
      }

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(userNotifications);

      if (insertError) {
        console.error(`❌ Error creating notifications for user ${user.email}:`, insertError);
      } else {
        createdCount += userNotifications.length;
        console.log(`✅ Created ${userNotifications.length} notifications for ${user.firstName} ${user.lastName}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Total notifications created: ${createdCount}`);
    console.log(`  - Users with notifications: ${users.length}`);

    // Now let's migrate some relevant activity data to notifications
    console.log('\n🔄 Migrating relevant activity data to notifications...');

    // Get recent activity data that could be relevant as notifications
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_log')
      .select(`
        id,
        action,
        entity_type,
        description,
        created_at,
        user_id,
        users (
          id,
          email,
          "firstName",
          "lastName"
        )
      `)
      .in('action', ['USER_LOGIN', 'FLIGHT_CREATED', 'INVOICE_CREATED', 'AIRCRAFT_ADDED'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (activitiesError) {
      console.error('❌ Error fetching activities:', activitiesError);
    } else {
      console.log(`✅ Found ${activities.length} relevant activities to migrate`);

      let migratedCount = 0;
      for (const activity of activities) {
        // Only create notifications for activities that have a user_id
        if (!activity.user_id) continue;

        // Determine notification type and content based on activity
        let notificationType = 'system';
        let title = 'System Activity';
        let message = activity.description || 'A system activity occurred';

        switch (activity.action) {
          case 'USER_LOGIN':
            notificationType = 'system';
            title = 'User Login';
            message = `${activity.users?.firstName || 'User'} logged into the system`;
            break;
          case 'FLIGHT_CREATED':
            notificationType = 'flight';
            title = 'Flight Log Created';
            message = `A new flight log was created by ${activity.users?.firstName || 'User'}`;
            break;
          case 'INVOICE_CREATED':
            notificationType = 'billing';
            title = 'Invoice Created';
            message = `A new invoice was created by ${activity.users?.firstName || 'User'}`;
            break;
          case 'AIRCRAFT_ADDED':
            notificationType = 'fleet';
            title = 'Aircraft Added';
            message = `A new aircraft was added to the fleet by ${activity.users?.firstName || 'User'}`;
            break;
        }

        // Check if notification already exists for this activity
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', activity.user_id)
          .eq('title', title)
          .eq('created_at', activity.created_at)
          .single();

        if (!existingNotification) {
          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: activity.user_id,
              title: title,
              message: message,
              type: notificationType,
              is_read: false,
              is_deleted: false,
              metadata: {
                activity_id: activity.id,
                action: activity.action,
                entity_type: activity.entity_type
              },
              created_at: activity.created_at,
              read_at: null,
              deleted_at: null
            });

          if (insertError) {
            console.error(`❌ Error migrating activity ${activity.id}:`, insertError);
          } else {
            migratedCount++;
          }
        }
      }

      console.log(`✅ Migrated ${migratedCount} activities to notifications`);
    }

    // Show final summary
    console.log('\n🎉 Notifications population completed!');
    console.log('\n📋 Final Summary:');
    console.log(`  - Sample notifications created: ${createdCount}`);
    console.log(`  - Activities migrated: ${migratedCount || 0}`);
    console.log(`  - Total notifications in system: ${createdCount + (migratedCount || 0)}`);

  } catch (error) {
    console.error('❌ Error populating notifications:', error);
  }
}

populateNotifications();
