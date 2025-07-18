const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const http2 = require('http2');
const bridge = require('http2-express-bridge'); //is not supported by express 5.1.0. I was suggested to downgrade to npm install express@4 
//const http2 = require('spdy');
const fileUploadRoutes = require('./modules/fileUpload');
const directoryRoutes = require('./modules/directory');
const authentificationRoutes = require('./modules/authentification');
const updateRoutes = require('./modules/update');
const retrievalRoutes = require('./modules/retrievals');

process.env.LANG = 'fr_FR.UTF-8';
dotenv.config();
//const app = express(); //for normal http or spd but http2 and its method CreateSecureServer are not supported by express and definitely do by nodejs
const app = bridge(express);
const PORT = process.env.PORT || 3039;
app.locals.users = []; // Temporary in-memory user storage
app.locals.sessions = [];
app.locals.roomDic = process.env.roomDic;
app.locals.secretKey = process.env.JWT_SECRET;

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

const departementsStr = directoryRoutes.readFile("./modules/Data/departements.json");
if(departementsStr !== undefined)
{
    app.locals.departements = JSON.parse(departementsStr);
    console.log(app.locals.departements);
}

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
}));


// File upload routes
app.use('/api/upload', fileUploadRoutes);

// Directory management routes
app.use('/api/directories', directoryRoutes.router);

app.use('/api/authentifications', authentificationRoutes );

app.use('/api/updates',updateRoutes);

app.use('/api/retrievals',retrievalRoutes);

// Server start
/*app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
*/

const options = {
  key: fs.readFileSync('./server.key'),
  cert: fs.readFileSync('./server.crt'),
  allowHTTP1: true // fallback for older clients
};


// Server start of http2
http2.createSecureServer(options, app).listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});
//does not work on express npm list express  `-- express@5.1.0  

/*//http2 is spd
http2.createServer(options, app).listen(PORT, () => {
 console.log(`Server running on port ${PORT}`);
});*/