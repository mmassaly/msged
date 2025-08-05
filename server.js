const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUploadRoutes = require('./modules/fileUpload');
const directoryRoutes = require('./modules/directory');
const authentificationRoutes = require('./modules/authentification');
const updateRoutes = require('./modules/update');
const retrievalRoutes = require('./modules/retrievals');

const fs = require('fs');

process.env.LANG = 'fr_FR.UTF-8';
dotenv.config();
const app = express(); 
const PORT = process.env.PORT || 3039;
app.locals.users = []; // Temporary in-memory user storage
app.locals.sessions = [];
app.locals.roomDic = process.env.roomDic;
app.locals.secretKey = process.env.JWT_SECRET;
app.locals.secretPassword = process.env.SECRET_PASSWORD;
app.locals.intervals = [];

const usersStr = directoryRoutes.readFile("./modules/Data/users.json");
if(usersStr !== undefined)
{
    app.locals.users = JSON.parse(usersStr);
}

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

const secretFoldersStr = directoryRoutes.readFile('./modules/Data/secretFolders.json')
if(secretFoldersStr !== undefined)
{
    app.locals.secretFolders = JSON.parse(secretFoldersStr);
    console.log(app.locals.secretFolders);
}
else
    app.locals.secretFolders = [];

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
}));

directoryRoutes.mapDirectory("./","principal","",{app},true);
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




