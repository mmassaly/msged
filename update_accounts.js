const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { connectDB, User } = require('./modules/db');

async function main() {
    const passwordHash = bcrypt.hashSync('0000', 10);
    console.log('Password hash for 0000 generated:', passwordHash);

    const usersJsonPath = path.join(__dirname, 'modules', 'Data', 'users.json');
    let existingUsers = [];
    if (fs.existsSync(usersJsonPath)) {
        try {
            existingUsers = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
        } catch (e) {
            existingUsers = [];
        }
    }

    // Target users requested by user
    const targetAccounts = [
        {
            name: "Malick Sow",
            username: "MrSow",
            email: "malicksow@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "MR",
            accountType: "user",
            type: "basic",
            role: "user",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Mamadou Massaly",
            username: "MMassaly",
            email: "mamadoumassaly@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "MR",
            accountType: "admin",
            type: "secret",
            role: "admin",
            imgSource: "Data/20240813_190707.jpg",
            twoFactorEnabled: false
        },
        {
            name: "Mamadou Massaly",
            username: "MMDev-39",
            email: "mamadoumassaly@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "MR",
            accountType: "admin",
            type: "secret",
            role: "admin",
            imgSource: "Data/20240813_190707.jpg",
            twoFactorEnabled: false
        },
        {
            name: "Ndèye Guitté Diouf",
            username: "NdeyeGuittéDiouf",
            email: "guittediouf@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "Mme",
            accountType: "user",
            type: "basic",
            role: "user",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Nafi Diagne (Ndoye Nafi Diagne)",
            username: "NafiDiagne",
            email: "nafidiagne@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "Mme",
            accountType: "user",
            type: "basic",
            role: "user",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Rosalie Sarr (Tine Rosalie Sarr)",
            username: "RosalieSarr",
            email: "rosaliesarr@msasenegal.com",
            password: passwordHash,
            room: "principal\\Administration",
            identifier: "Mme",
            accountType: "user",
            type: "secret",
            role: "user",
            accessPassword: "goidjdslf5+5y-ç_k5+",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Rosalie Sarr",
            username: "Rosalie",
            email: "rosaliesarr@msasenegal.com",
            password: passwordHash,
            room: "principal\\Administration",
            identifier: "Mme",
            accountType: "user",
            type: "secret",
            role: "user",
            accessPassword: "goidjdslf5+5y-ç_k5+",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Ramatoulaye Faye",
            username: "RamatoulayeFaye",
            email: "ramatoulayefaye@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "Mme",
            accountType: "user",
            type: "basic",
            role: "user",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "AA-Cissé",
            username: "AA-Cissé",
            email: "abcisse@msasenegal.com",
            password: passwordHash,
            room: "principal",
            identifier: "MR",
            accountType: "user",
            type: "basic",
            role: "user",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Amath Thiam",
            username: "amath.thiam",
            email: "amath.thiam@msasenegal.com",
            password: passwordHash,
            room: "principal//Administration",
            identifier: "MR",
            accountType: "user",
            type: "basic",
            role: "user",
            accessPassword: "goidjdslf5+5y-ç_k5+",
            imgSource: "",
            twoFactorEnabled: false
        },
        {
            name: "Amath Thiam",
            username: "AM-Thiam-1",
            email: "amath.thiam@msasenegal.com",
            password: passwordHash,
            room: "principal//Administration",
            identifier: "MR",
            accountType: "user",
            type: "basic",
            role: "user",
            accessPassword: "goidjdslf5+5y-ç_k5+",
            imgSource: "",
            twoFactorEnabled: false
        }
    ];

    // Build consolidated list: preserve any other users from existing list, but update their password to 0000!
    const usersMap = new Map();

    // Add existing users with password updated to 0000
    for (const u of existingUsers) {
        if (!u.username) continue;
        usersMap.set(u.username, {
            ...u,
            password: passwordHash
        });
    }

    // Apply / create target accounts
    for (const target of targetAccounts) {
        const existing = usersMap.get(target.username);
        if (existing) {
            usersMap.set(target.username, {
                ...existing,
                ...target,
                password: passwordHash
            });
        } else {
            usersMap.set(target.username, target);
        }
    }

    const finalUsers = Array.from(usersMap.values());

    // Save to users.json
    fs.writeFileSync(usersJsonPath, JSON.stringify(finalUsers, null, 2), 'utf8');
    console.log(`Saved ${finalUsers.length} users to ${usersJsonPath}`);

    // Sync to MongoDB if connected
    try {
        const conn = await connectDB();
        if (conn) {
            for (const u of finalUsers) {
                const clean = { ...u };
                delete clean._id;
                delete clean.__v;
                await User.findOneAndUpdate(
                    { username: u.username },
                    { $set: clean },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
            }
            console.log(`Synchronized ${finalUsers.length} users to MongoDB`);
        }
    } catch (err) {
        console.error('Error syncing to MongoDB:', err);
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
