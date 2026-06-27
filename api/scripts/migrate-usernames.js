const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, sparse: true },
    isPublicProfile: { type: Boolean, default: true }
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

const generateUniqueUsername = async (name, userId) => {
    let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
    if (!baseUsername) baseUsername = 'foodie';
    
    let username = baseUsername;
    let exists = await User.findOne({ username });
    let counter = 1;

    while (exists && exists._id.toString() !== userId.toString()) {
        username = `${baseUsername}${counter}`;
        exists = await User.findOne({ username });
        counter++;
    }
    return username;
};

async function migrate() {
    if (!MONGODB_URI) {
        console.error("MONGODB_URI not found in environment.");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        // Using a slightly more robust connection if it fails
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected successfully.");

        const users = await User.find({
            $or: [
                { username: { $exists: false } },
                { username: "" },
                { username: null }
            ]
        });

        console.log(`Found ${users.length} users needing migration.`);

        for (const user of users) {
            const username = await generateUniqueUsername(user.name || "user", user._id);
            await User.updateOne(
                { _id: user._id },
                { $set: { username, isPublicProfile: true } }
            );
            console.log(`Migrated: ${user.name} -> @${username}`);
        }

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

migrate();
