const mongoose = require('mongoose');
require('dotenv').config({ path: './Backend/.env' });

mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({});
  if (user) {
    const result = await db.collection('products').updateMany(
      { createdBy: { $exists: false } },
      { $set: { createdBy: user._id } }
    );
    console.log('Successfully isolated ' + result.modifiedCount + ' existing products to your account (' + user.email + ')!');
  } else {
    console.log('No users found in database yet.');
  }
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
