import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, IUser } from "../src/models/User";
import { generateUniqueUsername } from "../src/controllers/ProfileController";

dotenv.config();

const migrateUsernames = async () => {
    try {
        console.log("Connecting to MongoDB...");
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not defined");
        
        await mongoose.connect(uri);
        console.log("Connected successfully.");

        const usersWithoutUsername = await User.find({ 
            $or: [
                { username: { $exists: false } },
                { username: "" },
                { username: null }
            ]
        });

        console.log(`Found ${usersWithoutUsername.length} users to migrate.`);

        for (const userDoc of usersWithoutUsername) {
            try {
                const user = userDoc as any; // Cast to any to avoid TS issues in standalone script
                const username = await generateUniqueUsername(user.name || "user", user._id.toString());
                
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            username: username,
                            isPublicProfile: user.isPublicProfile ?? true
                        } 
                    }
                );
                
                console.log(`Migrated user ${user.name} -> @${username}`);
            } catch (err: any) {
                console.error(`Failed to migrate user ${userDoc._id}: ${err.message}`);
            }
        }

        console.log("Migration completed.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrateUsernames();
