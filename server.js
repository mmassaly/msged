const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUploadRoutes = require('./modules/fileUpload');
const directoryRoutes = require('./modules/directory');
const authentificationRoutes = require('./modules/authentification');
const updateRoutes = require('./modules/update');
const retrievalRoutes = require('./modules/retrievals').router;
const fs = require('fs');

process.env.LANG = 'fr_FR.UTF-8';
dotenv.config();

const app = express(); 
const PORT = process.env.PORT || 3039;

app.locals.users = []; // Temporary in-memory user storage
app.locals.sessions = [];
app.locals.roomDic = process.env.roomDic;
app.locals.secretKey = process.env.JWT_SECRET;
app.locals.secretAdminAccountKey = process.env.SECRET_ADMIN_ACCOUNT_KEY;
app.locals.secretPassword = process.env.SECRET_PASSWORD;
app.locals.intervals = [];

const usersStr = directoryRoutes.readFile("./modules/Data/users.json");
if(usersStr !== undefined)
{
    app.locals.users = JSON.parse(usersStr);
}
else
    app.locals.users = [];

const roomDicStr = directoryRoutes.readFile("./modules/Data/roomDic.json");
if(roomDicStr !== undefined)
{
    app.locals.roomDic = JSON.parse(roomDicStr);
    console.log(app.locals.roomDic);
}
else
{
    app.locals.roomDic = {};
}

const departementsStr = directoryRoutes.readFile("./modules/Data/departements.json");
if(departementsStr !== undefined)
{
    app.locals.departements = JSON.parse(departementsStr);
    console.log(app.locals.departements);
}
else
    app.locals.departements = [];
const secretFoldersStr = directoryRoutes.readFile('./modules/Data/secretFolders.json')
if(secretFoldersStr !== undefined)
{
    app.locals.secretFolders = JSON.parse(secretFoldersStr);
    console.log(app.locals.secretFolders);
}
else
    app.locals.secretFolders = [];

const archivedFoldersStr = directoryRoutes.readFile('./modules/Data/archives.json')
if(archivedFoldersStr !== undefined)
{
    app.locals.archives = JSON.parse(archivedFoldersStr);
    console.log(app.locals.archives);
}
else
    app.locals.archives = [];

const cvsDirFoldersStr = directoryRoutes.readFile('./modules/Data/cvFolders.json')
if(cvsDirFoldersStr !== undefined)
{
    app.locals.cvDirs = JSON.parse(cvsDirFoldersStr);
    
}
else
    app.locals.cvDirs = [];

const cvsStr = directoryRoutes.readFile('./modules/Data/cvs.json')
if(cvsStr !== undefined)
{
    app.locals.cvs = JSON.parse(cvsStr);
}
else
    app.locals.cvs = {};

const occupationsStr = directoryRoutes.readFile("./modules/Data/occupations.json");
if(occupationsStr !== undefined)
{
    app.locals.occupations = JSON.parse(occupationsStr);
}
else
    app.locals.occupations =[];

const partnersStr = directoryRoutes.readFile("./modules/Data/partners.json");
if(partnersStr !== undefined)
{
    app.locals.partners = JSON.parse(partnersStr);
}
else
    app.locals.partners = [];

const partnersDicStr = directoryRoutes.readFile("./modules/Data/partnersDic.json");
if(partnersDicStr !== undefined)
{
    app.locals.partnersDic = JSON.parse(partnersDicStr);
}
else
    app.locals.partnersDic = {};


const partnersDicReverseStr = directoryRoutes.readFile("./modules/Data/partnersDicReverse.json");
if(partnersDicReverseStr !== undefined)
{
    app.locals.partnersDicReverse = JSON.parse(partnersDicReverseStr);
}
else
    app.locals.partnersDicReverse = {};

if(Object.keys(app.locals.partnersDicReverse).length == 0)
{
    Object.entries(app.locals.partnersDic).map(([key,value])=> ({[value.fileName]:app.locals.partners.find(partner=> partner.name ==key)}));
}

const userPartnersStr = directoryRoutes.readFile("./modules/Data/userPartners.json");
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

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
}));

directoryRoutes.mapDirectory("./","principal","",{app},true);

const files = fs.readdirSync('./');

files.forEach(file => {
  console.log(file);
});

fs.writeFileSync("./modules/Data/roomDic.json",JSON.stringify(app.locals.roomDic));    
    
// File upload routes
app.use('/api/upload', fileUploadRoutes);

// Directory management routes
app.use('/api/directories', directoryRoutes.router);

app.use('/api/authentifications', authentificationRoutes );

app.use('/api/updates',updateRoutes);

app.use('/api/retrievals',retrievalRoutes);

// Server start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});




