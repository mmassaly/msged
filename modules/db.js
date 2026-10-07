const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/msa_ged';

// --- User Schema ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true, trim: true },
  name: { type: String, default: '' },
  password: { type: String, required: true },
  email: { type: String, default: '' },
  room: { type: String, default: 'principal' },
  identifier: { type: String, default: 'MR' },
  accountType: { type: String, default: 'user' },
  type: { type: String, default: 'basic' },
  role: { type: String, default: 'user' },
  imgSource: { type: String, default: '' },
  secret: { type: mongoose.Schema.Types.Mixed, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  accessPassword: { type: String, default: '' },
  partners: [{ type: String }],
  date: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
});

// --- Login Audit Schema ---
const loginAuditSchema = new mongoose.Schema({
  auditId: { type: String, unique: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  date: { type: String, index: true }, // YYYY-MM-DD
  month: { type: String, index: true }, // YYYY-MM
  year: { type: Number, index: true }, // YYYY
  dayOfYear: { type: Number, index: true },
  time: { type: String },
  username: { type: String, index: true },
  name: { type: String },
  email: { type: String },
  role: { type: String },
  room: { type: String },
  accountType: { type: String },
  type: { type: String },
  ip: { type: String },
  browser: { type: String },
  status: { type: String, default: 'Succès' }
}, {
  timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const LoginAudit = mongoose.models.LoginAudit || mongoose.model('LoginAudit', loginAuditSchema);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return mongoose.connection;
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
    return conn;
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    return null;
  }
};

/**
 * Seed or sync users from users.json into MongoDB
 */
const seedUsersFromJSON = async (usersFilePath) => {
  try {
    if (!fs.existsSync(usersFilePath)) return;
    const raw = fs.readFileSync(usersFilePath, 'utf8');
    if (!raw || raw.trim().length === 0) return;
    const usersJson = JSON.parse(raw);
    if (!Array.isArray(usersJson) || usersJson.length === 0) return;

    for (const u of usersJson) {
      if (!u.username) continue;
      const cleanUser = { ...u };
      delete cleanUser._id;
      await User.findOneAndUpdate(
        { username: u.username },
        { $set: cleanUser },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`[MongoDB] Seeded/synchronized ${usersJson.length} users from ${path.basename(usersFilePath)} into MongoDB`);
  } catch (err) {
    console.error('[MongoDB] Error seeding users from JSON:', err.message);
  }
};

/**
 * Seed or sync login audits from login_audit.json into MongoDB
 */
const seedAuditFromJSON = async (auditFilePath) => {
  try {
    if (!fs.existsSync(auditFilePath)) return;
    const raw = fs.readFileSync(auditFilePath, 'utf8');
    if (!raw || raw.trim().length === 0) return;
    const auditJson = JSON.parse(raw);
    if (!Array.isArray(auditJson) || auditJson.length === 0) return;

    for (const item of auditJson) {
      const id = item.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const dateObj = item.timestamp ? new Date(item.timestamp) : new Date();
      const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
      const dayOfYear = Math.ceil((dateObj - startOfYear) / (24 * 60 * 60 * 1000));
      const pad = (n) => String(n).padStart(2, '0');
      const dateStr = item.date || `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
      const monthStr = dateStr.substring(0, 7);

      await LoginAudit.findOneAndUpdate(
        { auditId: id },
        {
          $set: {
            auditId: id,
            timestamp: dateObj,
            date: dateStr,
            month: monthStr,
            year: dateObj.getFullYear(),
            dayOfYear: dayOfYear,
            time: item.time || `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`,
            username: item.username,
            name: item.name || item.username,
            email: item.email || '',
            role: item.role || 'Utilisateur',
            room: item.room || 'principal',
            accountType: item.accountType || 'user',
            type: item.type || 'basic',
            ip: item.ip || '127.0.0.1',
            browser: item.browser || 'Navigateur Web',
            status: item.status || 'Succès'
          }
        },
        { upsert: true }
      );
    }
    console.log(`[MongoDB] Seeded/synchronized ${auditJson.length} audit logs into MongoDB`);
  } catch (err) {
    console.error('[MongoDB] Error seeding audit from JSON:', err.message);
  }
};

/**
 * Get all users from MongoDB
 */
const getUsersFromDB = async () => {
  try {
    if (!isConnected) await connectDB();
    const users = await User.find({}).lean();
    return users.map(u => {
      const copy = { ...u };
      delete copy.__v;
      delete copy._id;
      return copy;
    });
  } catch (err) {
    console.error('[MongoDB] Error fetching users:', err.message);
    return null;
  }
};

/**
 * Save / Update a single user in MongoDB
 */
const saveUserToDB = async (userData) => {
  try {
    if (!isConnected) await connectDB();
    const clean = { ...userData };
    delete clean._id;
    delete clean.__v;
    return await User.findOneAndUpdate(
      { username: userData.username },
      { $set: clean },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error(`[MongoDB] Error saving user ${userData?.username}:`, err.message);
    return null;
  }
};

/**
 * Delete a user from MongoDB
 */
const deleteUserFromDB = async (username) => {
  try {
    if (!isConnected) await connectDB();
    return await User.deleteOne({ username });
  } catch (err) {
    console.error(`[MongoDB] Error deleting user ${username}:`, err.message);
    return null;
  }
};

/**
 * Record a login audit entry in MongoDB
 */
const recordAuditToDB = async (entry) => {
  try {
    if (!isConnected) await connectDB();
    const dateObj = entry.timestamp ? new Date(entry.timestamp) : new Date();
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((dateObj - startOfYear) / (24 * 60 * 60 * 1000));
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = entry.date || `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
    const monthStr = dateStr.substring(0, 7);
    const id = entry.id || `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const doc = new LoginAudit({
      auditId: id,
      timestamp: dateObj,
      date: dateStr,
      month: monthStr,
      year: dateObj.getFullYear(),
      dayOfYear: dayOfYear,
      time: entry.time || `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`,
      username: entry.username,
      name: entry.name || entry.username,
      email: entry.email || '',
      role: entry.role || 'Utilisateur',
      room: entry.room || 'principal',
      accountType: entry.accountType || 'user',
      type: entry.type || 'basic',
      ip: entry.ip || '127.0.0.1',
      browser: entry.browser || 'Navigateur Web',
      status: entry.status || 'Succès'
    });

    await doc.save();
    return doc;
  } catch (err) {
    console.error('[MongoDB] Error saving audit to MongoDB:', err.message);
    return null;
  }
};

module.exports = {
  connectDB,
  User,
  LoginAudit,
  seedUsersFromJSON,
  seedAuditFromJSON,
  getUsersFromDB,
  saveUserToDB,
  deleteUserFromDB,
  recordAuditToDB,
  MONGODB_URI
};

