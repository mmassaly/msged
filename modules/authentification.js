
const roomUpdates = require('./roomUtil');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const useragent = require('express-useragent');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const bodyPix = require('@tensorflow-models/body-pix');
const tf = require('@tensorflow/tfjs');
const { createCanvas, ImageData } = require('canvas');


router.use(express.json());
router.use(useragent.express());
// Signup route
const storage = multer.diskStorage({
    limits: {
    fileSize: Infinity // This disables file size limit
    },
    destination: (req, file, cb) => {
      const uploadPath = path.join("./", 'Data');
      if(!fs.existsSync(uploadPath)) 
      {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Use the original file name or generate a unique name
      // Here we are using the original name, but you can modify it as needed
      console.log(file);     
      req.imgpath = path.join("./","Data",file.originalname); // Store the image source in the request body
      req.imgFileInPath = file;
      console.log(file.originalname);
      cb(null,decodeURI(file.originalname));
    }});

const upload = multer({ storage ,limits: {
    files: Infinity,
    parts: Infinity
}});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    //console.log(req.headers);
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    if (token == undefined) return res.sendStatus(401);
    var yourSession = req.app.locals.sessions.filter(session => session.username == userName);
    
    if(!yourSession)
    {
        res.status(403).json({ message: 'Invalid username' });
        return;
    }

    yourSession = yourSession.find( session => session.currentToken == token);
    console.log(req.app.locals.sessions);
    console.log(token);
    if( !yourSession)
    {    
       res.status(403).json({ message: 'Invalid token' });
        return;
    }

    jwt.verify(token, req.app.locals.secretKey, (err, user) => {
        if (err){ 
            return res.status(403).json({ message: 'Token not matched' });
        }//json({ message: 'Token not matched' });;
        req.user = user;
        next();
    });
};
//npm install @tensorflow-models/body-pix @tensorflow/tfjs
router.put('/signup',authenticateToken ,upload.single("imgSource"),async (req, res) => {
  const { oldUser,newUser,room } = req.body;
   var command ={entryparams:{fieldName:"user_info",operation:"update_user_info"},
   command:{newUser,oldUser}};
   console.log(oldUser);console.log(newUser);console.log(req.app.locals.users);
   console.log(req.imgFileInPath);
   
   try
   {
      const imageBuffer = req.imgFileInPath.buffer;
      const imageTensor = tf.node.decodeImage(imageBuffer);


      const canvas = createCanvas(imageTensor.shape[1], imageTensor.shape[0]);
      const ctx = canvas.getContext('2d');

      await bodyPix.load();
      const segmentation = await net.segmentPerson(imageTensor, {
              internalResolution: 'medium',
              segmentationThreshold: 0.7,
            });
      const maskImage = bodyPix.toMask(segmentation);

          // Convert mask to ImageData
      const imageData = new ImageData(
            Uint8ClampedArray.from(maskImage.data),
            maskImage.width,
            maskImage.height
      );
          
      const outputPath = path.join("./","Data", `${file.filename}_edit.png`);

          // Draw mask onto canvas
      ctx.putImageData(imageData, 0, 0);

          // Extract alpha channel to apply transparency
      const maskedBuffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, maskedBuffer);
      req.imgpathEdit = outputPath;

   }
   catch (error) 
   {
      console.error('Error processing image:', error);
   }
  if(!oldUser || !newUser) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  if(!req.app.locals.users || !Array.isArray(req.app.locals.users)) {
    return res.status(500).json({ message: 'User data not available' });
  }
  if(!req.app.locals.users.find(user => user.username === oldUser.username)) {
    return res.status(404).json({ message: 'User not found' });
  }
  req.app.locals.users = req.app.locals.users.map(user => {
    if (user.username === oldUser.username) {
      return {
        ...user,
        username: newUser.username? newUser.username: user.username,
        email: newUser.email? newUser.email: user.email,
        role: newUser.role? newUser.role: user.role,
        imgSource: req.imgpathEdit?req.imgpathEdit:req.imgpath,
        password: newUser.password ? bcrypt.hashSync(newUser.password, 10) : user.password
      };
    }
    return user;
  });
  req.app.locals.sessions = req.app.locals.sessions.map(session => {
    if (session.username === oldUser.username) {  }
      return {
        ...session,
        username: newUser.username? newUser.username : session.username,
        password: newUser.password ? bcrypt.hashSync(newUser.password, 10) : session.password,
        room: newUser.room? newUser.room : session.room,
        type: newUser.type? newUser.type: session.type,
        currentToken: newUser.token?newUser.token:session.currentToken, // or Keep the same token
      };
    });
  fs.writeFileSync("./modules/Data/users.json", JSON.stringify(req.app.locals.users, null, 2));
  var command ={entryparams:{fieldName:"user_info",operation:"update_user_info"},
   command:{oldUser, newUser}};
         
  roomUpdates(req,room,command);
  res.status(200).json({ message: 'User updated successfully' });
});
router.post('/signup', async (req, res) => {
  const { imgSource ,name, username, password,room
    ,identifier,accessType,accessPassword
    ,admin,secretAdminAccountPassword } = req.body;
  
  //console.log(req.body);
  //console.log(req.app.locals);

  if(admin && req.app.locals.secretAdminAccountKey != secretAdminAccountPassword)
  {
    return res.status(400).json({ message: "Vous n'êtes pas permis de créer un compte d'administrateur." });
  }
  else if(accessType && accessType == "secret" && req.app.locals.secretPassword != accessPassword)
  {
    return res.status(400).json({ message: "Vous n'êtes pas permis de créer ce un compte secret." });
  }
  else if ((!accessType || accessType == "basic") && req.app.locals.secretPassword != accessPassword)
  {
    return res.status(400).json({ message: "Vous n'êtes pas permis de créer un compte basique." });
  }
  // Check if user already exists
  const existingUser = req.app.locals.users.find(user => user.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "L'utilisateur existe déjà" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store user
  req.app.locals.users.push({ imgSource,name,username, password: hashedPassword,room:room,identifier,accountType:admin?"admin":"user",type:admin?"secret":accessType });
  const users = JSON.stringify(req.app.locals.users);
  fs.writeFileSync("./modules/Data/users.json",users);
  res.status(200).json({ message: 'User registered successfully' });
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password,previousToken} = req.body;
  // Find user
  const user = req.app.locals.users.find(user => user.username === username);
  if (!user) {
    return res.status(400).json({ message: 'Invalid username' });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Invalid password' });
  }
  /*const forbiddenindex = req.app.locals.sessions.findIndex( session => session.oldToken == previousToken );
  if(forbiddenindex >= 0)
  {
    res.status(403).json({ message: 'forbidden token error', previousToken });
    return;
  }*/
  // Generate JWT
  const token = jwt.sign({ username }, req.app.locals.secretKey, { expiresIn: '10m' });
  const newSession = {date:new Date(Date.now()), username:username, password:password,
    currentToken : token, oldToken: previousToken,
    type: user.type?user.type:user.accountType == "admin"?"secret":"basic",
    accountType:user.accountType,room: user.room,hasFinished:false,useragent:req.useragent,commands:[]};
/*console.log("************BEFORE************");
    console.log(req.app.locals.sessions);
  console.log("**********BEFORE**************");*/
  
  if( req.app.locals.sessions.
    find(session => (JSON.stringify(session.useragent) == JSON.stringify(req.useragent)
     && (session.currentToken == newSession.currentToken || session.currentToken == newSession.oldToken)
     && session.username == newSession.username 
     && session.password == newSession.password 
     && session.room == newSession.room
     && session.hasFinished) ) == undefined ) 
  { 
    const timeoutValue = setTimeout(()=>{newSession.hasFinished =true;
      newSession.commands.push({message:"loginexperied",date:new Date(Date.now())});},600000);
    req.app.locals.sessions.push(newSession);
    req.app.locals.intervals.push({interval:timeoutValue,session:newSession});
  }

  if(previousToken)
  {
    const index = req.app.locals.sessions.findIndex( session => session.currentToken == previousToken );
    if( index > -1 )
    {
      const objFound = req.app.locals.sessions[index];
      req.app.locals.sessions.splice(index,1);
      console.log("session deleted");

      var index2  = req.app.locals.intervals.findIndex(obj=> obj.session == objFound);
      if(index2>=0)
      {
        clearTimeout(req.app.locals.intervals[index2].timeoutValue);
        req.app.locals.intervals.splice(index2,1);
        console.log("timeout cleared");
      }
    }
    
    console.log('previous login token index is '+index);
    
    //console.log(previousToken);
    ///console.log(req.app.locals.sessions);
  }
  
  /*console.log("************AFTER************");
    console.log(req.app.locals.sessions);
  console.log("**********AFTER**************");*/
  res.status(200).json({ message: 'Login successful', token,room:user.room,type:newSession.type,accountType:newSession.accountType,imgSource:user.imgSource,name:user.name,identifier: user.identifier});
});

// Protected route example
router.get('/protected', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, req.app.locals.secretKey);
    res.status(200).json({ message: 'Access granted', user: decoded });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.get('/list',authenticateToken, (req, res) => {
  const username = req.headers['authorization']?.split(' ')[0];
  
  try {
    const user = req.app.locals.users.find(user => user.username === username);
    if (!user) 
    {
      return res.status(404).json({ message: 'User not found' });
    }
    if(user.accountType == "admin" && req.app.locals.users)
      res.status(200).json({ users: req.app.locals.users.map(user2 => Object.fromEntries(Object.entries(user2).filter(([key])=> key != 'password'))) });
    else if(user.accountType != "admin" && req.app.locals.users)
    {
      res.status(200).json({ users: req.app.locals.users.filter(user2 =>
         user2.room && user2.room.startsWith(user.room))
         .map(user2 => Object.fromEntries(Object.entries(user2).filter(([key])=> key != 'password'))) });
    } 
    else
    {
      res.status(500).json({ message: 'User data not available' });
    }
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

module.exports = router;
