const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const fileUploadRoutes = require('./modules/fileUpload');
const directoryRoutes = require('./modules/directory');
const authentificationRoutes = require('./modules/authentification');
const updateRoutes = require('./modules/update');
const retrievalRoutes = require('./modules/retrievals').router;
const db = require('./modules/db');
const fs = require('fs');
const path = require('path');

const app = express(); 
const PORT = process.env.PORT || 3039;

app.locals.users = []; // Temporary in-memory user storage
app.locals.sessions = [];
app.locals.roomDic = process.env.roomDic;
app.locals.secretKey = process.env.JWT_SECRET || 'msged_jwt_secret_key_default_2026';
app.locals.secretAdminAccountKey = process.env.SECRET_ADMIN_ACCOUNT_KEY || 'msged_admin_secret_key';
app.locals.secretPassword = process.env.SECRET_PASSWORD || 'msged_secret_password';
app.locals.intervals = [];

const usersJsonPath = path.join(__dirname, 'modules', 'Data', 'users.json');
const auditJsonPath = path.join(__dirname, 'modules', 'Data', 'login_audit.json');

// Synchronous initial read from users.json as fast bootstrap
const usersStr = directoryRoutes.readFile(usersJsonPath);
if(usersStr !== undefined)
{
    try {
        app.locals.users = JSON.parse(usersStr);
    } catch(e) {
        app.locals.users = [];
    }
}
else
    app.locals.users = [];

// Initialize MongoDB and synchronize collections asynchronously
db.connectDB().then(async () => {
    await db.seedUsersFromJSON(usersJsonPath);
    await db.seedAuditFromJSON(auditJsonPath);
    const dbUsers = await db.getUsersFromDB();
    if (dbUsers && dbUsers.length > 0) {
        app.locals.users = dbUsers;
        console.log(`[MongoDB] Synchronized ${dbUsers.length} users from MongoDB`);
    }
}).catch(err => {
    console.error('[MongoDB Startup Error]', err);
});

const roomDicStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','roomDic.json'));
if(roomDicStr !== undefined)
{
    app.locals.roomDic = JSON.parse(roomDicStr);
    ////console.log(app.locals.roomDic);
}
else
{
    app.locals.roomDic = {"principal":["principal"],"principal/Administration":["principal","principal/Administration"],"principal/Comptabilité": ["principal","principal/Comptabilité"],"principal/Finances": ["principal","principal/Finances"],"principal/Gestion": ["principal","principal/Gestion"],"principal/Ressources Humaines (RH)": ["principal","principal/Ressources Humaines (RH)"],"principal/Tech et Développement de logiciels": ["principal","principal/Tech et Développement de logiciels"],"principal/Dossier d'archives": ["principal","principal/Dossier d'archives"]};
    directoryRoutes.writeFile(path.join(__dirname, 'modules', 'Data','roomDic.json'), JSON.stringify(app.locals.roomDic));
}

const departementsStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','departements.json'));
if(departementsStr !== undefined)
{
    app.locals.departements = JSON.parse(departementsStr);
    //console.log(app.locals.departements);
}
else
    app.locals.departements = [];
const secretFoldersStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','secretFolders.json'));
if(secretFoldersStr !== undefined)
{
    app.locals.secretFolders = JSON.parse(secretFoldersStr);
    //console.log(app.locals.secretFolders);
}
else
    app.locals.secretFolders = [];

const archivedFoldersStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','archives.json'));
if(archivedFoldersStr !== undefined)
{
    app.locals.archives = JSON.parse(archivedFoldersStr);
    //console.log(app.locals.archives);
}
else
    app.locals.archives = [];

const cvsDirFoldersStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','cvFolders.json'));
if(cvsDirFoldersStr !== undefined)
{
    app.locals.cvDirs = JSON.parse(cvsDirFoldersStr);
    
}
else
    app.locals.cvDirs = [];

const cvsStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','cvs.json'));
if(cvsStr !== undefined)
{
    app.locals.cvs = JSON.parse(cvsStr);
}
else
    app.locals.cvs = {};

const occupationsStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','occupations.json'));
if(occupationsStr !== undefined)
{
    app.locals.occupations = JSON.parse(occupationsStr);
}
else
    app.locals.occupations =[];

const partnersStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','partners.json'));
if(partnersStr !== undefined)
{
    app.locals.partners = JSON.parse(partnersStr);
}
else
    app.locals.partners = [];

const partnersDicStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','partnersDic.json'));
if(partnersDicStr !== undefined)
{
    app.locals.partnersDic = JSON.parse(partnersDicStr);
}
else
    app.locals.partnersDic = {};


const partnersDicReverseStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data','partnersDicReverse.json'));
if(partnersDicReverseStr !== undefined)
{
    app.locals.partnersDicReverse = JSON.parse(partnersDicReverseStr);
}
else
    app.locals.partnersDicReverse = {};
//console.log(app.locals.partnersDic);
//console.log("-------------------------------------------------------------------");
if(Object.keys(app.locals.partnersDicReverse).length == 0)
{
    app.locals.partnersDicReverse = Object.entries(app.locals.partnersDic).reduce((acc,[key,value])=> {
        value.forEach(someVal=> {
            let found = app.locals.partners.find(partner=> partner.name ==key);
                
            if(!acc[someVal.path] )
            {
                acc[someVal.path] = [];
                if(found)
                    acc[someVal.path] = [found];
            }
            else
            {
                if(found)
                    acc[someVal.path].push(found);
            }
        });
        return acc;
    } ,{});
}
//console.log("-------------------------------------------------------------------");
//console.trace(app.locals.partnersDicReverse);
const userPartnersStr = directoryRoutes.readFile(path.join(__dirname, 'modules', 'Data', 'userPartners.json'));
if(userPartnersStr !== undefined)
{
    app.locals.userPartners = JSON.parse(userPartnersStr);
    app.locals.users = app.locals.users.map(user=> {
        let newUser = user;
        newUser.partners = app.locals.userPartners[user.username] ? app.locals.userPartners[user.username] : [];
        return newUser; 
    });
}
else
    app.locals.userPartners = {};
console.trace(app.locals.partnersDicReverse);
// app.use(cors({
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     allowedHeaders: ["Authorization", "Content-Type"],
// }));

directoryRoutes.mapDirectory("./","principal","",{app},true);
// const files = fs.readdirSync('./');

// files.forEach(file => {
//   console.log(file);
// });

/*fs.writeFileSync(path.join(__dirname, 'modules', 'Data', 'roomDic.json'), JSON.stringify(app.locals.roomDic));
*/
// File upload routes
app.use('/api/upload', fileUploadRoutes);

// Directory management routes
app.use('/api/directories', directoryRoutes.router);

app.use('/api/authentifications', authentificationRoutes );

app.use('/api/updates',updateRoutes);

app.use('/api/retrievals',retrievalRoutes);

// Server start
app.listen(PORT, () => {
    //console.log(`Server running on port ${PORT}`);
});




