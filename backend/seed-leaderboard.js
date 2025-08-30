const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Sample users with points for leaderboard testing
const sampleUsers = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    password: 'password123',
    role: 'community',
    phone: '+91-98765-43210',
    location: 'Mumbai',
    totalPoints: 1250,
  },
  {
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@example.com',
    password: 'password123',
    role: 'NGO',
    phone: '+91-98765-43211',
    location: 'Delhi',
    totalPoints: 980,
  },
  {
    name: 'Anita Patel',
    email: 'anita.patel@example.com',
    password: 'password123',
    role: 'community',
    phone: '+91-98765-43212',
    location: 'Bangalore',
    totalPoints: 875,
  },
  {
    name: 'Suresh Verma',
    email: 'suresh.verma@example.com',
    password: 'password123',
    role: 'govt',
    phone: '+91-98765-43213',
    location: 'Chennai',
    totalPoints: 720,
  },
  {
    name: 'Meera Singh',
    email: 'meera.singh@example.com',
    password: 'password123',
    role: 'NGO',
    phone: '+91-98765-43214',
    location: 'Kolkata',
    totalPoints: 650,
  },
  {
    name: 'Vikram Malhotra',
    email: 'vikram.malhotra@example.com',
    password: 'password123',
    role: 'community',
    phone: '+91-98765-43215',
    location: 'Hyderabad',
    totalPoints: 580,
  },
  {
    name: 'Sunita Reddy',
    email: 'sunita.reddy@example.com',
    password: 'password123',
    role: 'community',
    phone: '+91-98765-43216',
    location: 'Pune',
    totalPoints: 495,
  },
  {
    name: 'Arun Joshi',
    email: 'arun.joshi@example.com',
    password: 'password123',
    role: 'NGO',
    phone: '+91-98765-43217',
    location: 'Ahmedabad',
    totalPoints: 420,
  },
  {
    name: 'Kavita Gupta',
    email: 'kavita.gupta@example.com',
    password: 'password123',
    role: 'community',
    phone: '+91-98765-43218',
    location: 'Jaipur',
    totalPoints: 380,
  },
  {
    name: 'Rahul Mehta',
    email: 'rahul.mehta@example.com',
    password: 'password123',
    role: 'govt',
    phone: '+91-98765-43219',
    location: 'Mumbai',
    totalPoints: 320,
  },
];

async function seedLeaderboard() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing users)
    // await User.deleteMany({});
    // console.log('🗑️ Cleared existing users');

    // Check if users already exist
    const existingUsers = await User.find({ email: { $in: sampleUsers.map(u => u.email) } });
    if (existingUsers.length > 0) {
      console.log('⚠️ Some users already exist, updating their points...');
      
      for (const user of existingUsers) {
        const sampleUser = sampleUsers.find(su => su.email === user.email);
        if (sampleUser) {
          user.totalPoints = sampleUser.totalPoints;
          await user.save();
          console.log(`✅ Updated ${user.name} with ${user.totalPoints} points`);
        }
      }
    } else {
      // Create new users
      const createdUsers = await User.create(sampleUsers);
      console.log(`✅ Created ${createdUsers.length} sample users`);
      
      createdUsers.forEach(user => {
        console.log(`👤 ${user.name}: ${user.totalPoints} points (${user.role})`);
      });
    }

    // Verify leaderboard data
    const leaderboard = await User.find()
      .select('name role location totalPoints')
      .sort({ totalPoints: -1 })
      .limit(10);

    console.log('\n🏆 Current Leaderboard:');
    leaderboard.forEach((user, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${index + 1}. ${user.name} - ${user.totalPoints} points (${user.role})`);
    });

    console.log('\n✅ Leaderboard seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding leaderboard:', error);
    process.exit(1);
  }
}

// Run the seed function
seedLeaderboard();
