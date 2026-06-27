const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/foodies-pakistan')
    .then(async () => {
        const db = mongoose.connection.db;
        const restaurants = await db.collection('restaurants').find({}).toArray();
        console.log(`\nFound ${restaurants.length} total restaurants.`);
        restaurants.forEach(r => {
            console.log(`\nName: ${r.name}`);
            console.log(`City: ${r.city}`);
            console.log(`isApproved: ${r.isApproved}`);
            console.log(`isActive: ${r.isActive}`);
            console.log(`Location: lat=${r.latitude}, lng=${r.longitude}`);
        });
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
