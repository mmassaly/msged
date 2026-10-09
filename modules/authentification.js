//nvm install 18
//nvm use 18

const roomUtil = require('./roomUtil');
const roomUpdates = roomUtil.roomUpdates;
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const useragent = require('express-useragent');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const nodemailerCustom = require('./nodemailercustom');
const totp = require('./TOTP');
const db = require('./db');

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
      cb(null,decodeURI(file.originalname));
    }});

const upload = multer({ storage ,limits: {
    files: Infinity,
    parts: Infinity
}});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    if (!token) return res.sendStatus(401);

    const secret = req.app.locals.secretKey || process.env.JWT_SECRET || 'msged_jwt_secret_key_default_2026';

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Token not matched or expired' });
        }
        
        req.user = decoded;
        const targetUsername = userName || decoded.username;

        if (!req.app.locals.sessions) {
            req.app.locals.sessions = [];
        }

        // Find or restore session in memory
        let yourSession = req.app.locals.sessions.find(s => 
            s.username === targetUsername && (s.currentToken === token || s.oldTokens?.includes(token))
        );

        const foundUser = req.app.locals.users?.find(u => u.username === targetUsername);

        if (!yourSession && foundUser) {
            // Restore session seamlessly if server restarted but token is valid
            yourSession = {
                date: new Date(),
                lastActive: new Date(),
                username: foundUser.username,
                currentToken: token,
                oldTokens: [],
                type: foundUser.type || (foundUser.accountType === 'admin' ? 'secret' : 'basic'),
                accountType: foundUser.accountType || 'user',
                room: foundUser.room || 'principal',
                hasFinished: false,
                useragent: req.useragent,
                commands: [],
                partners: req.app.locals.userPartners?.[foundUser.username] ?? []
            };
            req.app.locals.sessions.push(yourSession);
            console.log(`[SESSION RECOVERED] Active session restored for ${foundUser.username}`);
        } else if (yourSession) {
            yourSession.lastActive = new Date();
            yourSession.hasFinished = false;
        }

        next();
    });
};
//npm install @tensorflow-models/body-pix @tensorflow/tfjs
router.put('/signup',authenticateToken ,upload.single("imgSource"),async (req, res) => {
  var { oldUser,newUser,room } = req.body;
  oldUser = JSON.parse(oldUser);
  newUser = JSON.parse(newUser);
  var command ={entryparams:{fieldName:"user_info",operation:"update_user_info"},
  command:{newUser,oldUser}};
  //console.log(oldUser.username); console.log(newUser);
  newUser.imgSource = req.imgpath;

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
        name: newUser.name? newUser.name: user.name,
        email: newUser.email? newUser.email: user.email,
        role: newUser.role? newUser.role: user.role,
	      room: newUser.room? newUser.room : session.room,
        type: newUser.type? newUser.type: session.type,
        imgSource: req.imgpath,
        accountType: newUser.accountType? newUser.accountType: user.accountType,
        password: newUser.password && newUser.password.trim().length > 0  ? 
	bcrypt.hashSync(newUser.password, 10) : user.password
      };
    }
   
    return user;
  });
  req.app.locals.sessions = req.app.locals.sessions.map(session => {
    if (session.username === oldUser.username) {  
      return {
        ...session,
        username: newUser.username? newUser.username : session.username,
        password: newUser.password && newUser.password.trim().length > 0 ? bcrypt.hashSync(newUser.password, 10) : session.password,
        room: newUser.room? newUser.room : session.room,
        type: newUser.type? newUser.type: session.type,
        currentToken: newUser.token?newUser.token:session.currentToken, // or Keep the same token
      };}
	return session;
    });
  
  const editorUsername = req.user?.username;
  const isITAdmin = editorUsername === 'MMDev-39' || req.user?.role === 'itadmin' || req.body?.isITAdmin === true || req.body?.isITAdmin === 'true';

  if (!isITAdmin && (oldUser.email || newUser.email)) {
    nodemailerCustom.notifyAccountChanges(!oldUser.email ? newUser.email : oldUser.email,
      getChangedProps(oldUser, newUser));
  } else if (isITAdmin) {
    console.log(`[ITadmin Privilege] ${editorUsername} edited user "${oldUser.username}" without sending email notification.`);
  }
  
  console.log("Writting to file and synchronizing with MongoDB");
  fs.writeFileSync("./modules/Data/users.json", JSON.stringify(req.app.locals.users.map(user => {
    let u = { ...user };
    delete u["partners"];
    return u;
  }), null, 2));

  // Sync with MongoDB
  const targetUser = req.app.locals.users.find(u => u.username === (newUser.username || oldUser.username));
  if (targetUser) {
    db.saveUserToDB(targetUser);
  }

  var command ={entryparams:{fieldName:"user_info",operation:"update_user_info"},
  command:{oldUser, newUser}};
         
  roomUpdates(req,room,command);
  res.status(200).json({ message: 'User updated successfully' });
});

// --- Détection des changements ---
function getChangedProps(user, newUser) 
{
  console.trace(user,newUser);
  const updated = {
    username: newUser.username?newUser.username:user.username,
    name: newUser.name? newUser.name: user.name,
    email: newUser.email?newUser.email:user.email,
    role: newUser.role?newUser.role:user.role ,
    room: newUser.room?newUser.room:user.room ,
    type: newUser.type?newUser.type:user.type,
    accountType: newUser.accountType?newUser.accountType:user.accountType,
    password:
      newUser.password && user.password?!bcrypt.compareSync(newUser.password, user.password)?newUser.password:user.password
      :user.password
  };

  const changedProps = [];
  if (updated.username !== user.username) changedProps.push({ field: "Nom d’utilisateur", old: user.username, new: updated.username });
  if (updated.name !== user.name) changedProps.push({ field: "Nom", old: user.name, new: updated.name });
  if (updated.email !== user.email) changedProps.push({ field: "Email", old: user.email, new: updated.email });
  if (updated.role !== user.role) changedProps.push({ field: "Rôle", old: user.role, new: updated.role });
  if (updated.room !== user.room) changedProps.push({ field: "Département", old: user.room, new: updated.room });
  if (updated.type !== user.type) changedProps.push({ field: "Type", old: user.type, new: updated.type });
  if (updated.accountType !== user.accountType) changedProps.push({ field: "Type de compte", old: user.accountType, new: updated.accountType });
  if (updated.password !== user.password && user.password) changedProps.push({ field: "Mot de passe", old: user.password, new: newUser.password });

  /*console.log("------------------------------------");
  console.trace(newUser);
  console.log("------------------------------------");
  console.trace(user);
  console.log("------------------------------------");*/

  return { updated, changedProps };
}


router.delete('/signup',authenticateToken ,async (req, res) => {
  var { username, room } = req.body;
  
  if(!req.app.locals.users || !Array.isArray(req.app.locals.users)) {
    return res.status(500).json({ message: "Données sur l'utilisateur ne sont pas disponibles" });
  }
  const userFound = req.app.locals.users.find(user => 
    user.username == username);
  if(!userFound)
  {
    return res.status(404).json({ message: "L'utilisateur n'éxiste pas." });
  }

  var command ={entryparams:{fieldName:"user_info",operation:"delete_user_info"},
  command:{username,room }};

  const  foundValueIndex = req.app.locals.users.findIndex(value => value.username == username
    && value.room == room);
    if(foundValueIndex >= 0)
  {
    req.app.locals.users.splice(foundValueIndex,1);
    const users = JSON.stringify(req.app.locals.users.map(user => {
      let newUser = user;
      delete newUser["partners"];
      return newUser;
    }), null, 2);
    fs.writeFileSync("./modules/Data/users.json", users);
    db.deleteUserFromDB(username);
  }     
  roomUpdates(req,room,command);
  res.status(200).json({ message: "L'utilisateur a été enlevé sans problèmes." });

});
router.delete('/partner',authenticateToken, (req, res) => {
  const {name} = req.body;
  if(req.app.locals.userPartners[req.user.username])
  {
      const index = req.app.locals.userPartners[req.user.username].findIndex(element => element == name);
      if(index >= 0)    
      {
        req.app.locals.userPartners[req.user.username].splice(index,1);
        try
        {
          fs.writeFileSync("./modules/Data/userPartners.json",JSON.stringify(req.app.locals.userPartners));  
        }
        catch(err)
        {
            res.status(500).json({message:err});
            return;
        }
      }
  }
  res.status(200).json({message:"Partenaire enlevé avec succès"});
});
router.post('/partner',authenticateToken, (req, res) => {
  const {name} = req.body;
  if(!name)
  {
    res.status(400).json({message:"Aucun partenaire fourni"});
    return;
  } 
  if(req.app.locals.userPartners[req.user.username])
  {
    if(!req.app.locals.userPartners[req.user.username].find(element => element == name))
      req.app.locals.userPartners[req.user.username].push(name);
  }
  else
  {
      req.app.locals.userPartners[req.user.username] = [name];
  }
  
  try
  {
      console.log("Writting user partners to file");
      fs.writeFileSync("./modules/Data/userPartners.json",JSON.stringify(req.app.locals.userPartners));
  }
  catch(err)
  {
    console.trace(err);
    res.status(500).json({message:err});
    return;
  }


  try
  {
    console.log("Updating rooms for new partner addition");
    var command ={entryparams:{fieldName:"partners",operation:"add_user_partner"},
    command:{name}};
    roomUpdates(req,req.user.room,command);
  }
  catch(err)
  {
    res.status(500).json({message:err});
    console.trace(err);
    return;
  }

  res.status(200).json({message:"Partenaire ajouté avec succès"});

});
router.post('/signup', async (req, res) => {
  const { imgSource ,name, username, password, room
    ,identifier,accessType,accessPassword
    ,admin,secretAdminAccountPassword,email,guestFlag,guest } = req.body;
  
  //console.log(req.body);
  //console.log(req.app.locals);
  console.log("Inside Post");
  console.log(secretAdminAccountPassword);
  console.log(req.app.locals.secretAdminAccountKey);
  console.log(admin);
  console.log(admin && req.app.locals.secretAdminAccountKey != secretAdminAccountPassword);
  //fd
  if(admin && req.app.locals.secretAdminAccountKey != secretAdminAccountPassword)
  {
    console.log(admin && req.app.locals.secretAdminAccountKey != secretAdminAccountPassword);
    return res.status(400).json({ message: "Vous n'êtes pas permis de créer un compte d'administrateur." });
  }
  else if(guestFlag && guest != "host" && guest != "partner")
  {
    return res.status(400).json({ message: "Type d'invité non valide." });
  }
  else if(!guestFlag && !(admin && req.app.locals.secretAdminAccountKey == secretAdminAccountPassword)
    && (accessType && accessType == "secret" && req.app.locals.secretPassword != accessPassword))
  {
    return res.status(400).json({ message: "Vous n'êtes pas permis de créer ce un compte secret." });
  }
  else if (!guestFlag && !(admin && req.app.locals.secretAdminAccountKey == secretAdminAccountPassword)
    && (!accessType || accessType == "basic") && req.app.locals.secretPassword != accessPassword)
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
  const newUser = { imgSource,name,username,email, password: hashedPassword,room:room
    ,identifier,accountType:guestFlag?guest:admin?"admin":"user",date:new Date(Date.now()),type:guestFlag?guest:admin?"secret":accessType,partners:[]};
  
  if(email)
  {
      nodemailerCustom.sendNewAccountMailOptions(email,["Nom d'utilisateur:"+username,"Mot de passe:"+password],undefined);
  }
  // Store user
  req.app.locals.users.push(newUser);
  
  fs.writeFileSync("./modules/Data/users.json",JSON.stringify(
    req.app.locals.users.map(user => {
      let newUser = { ...user };   // clone to avoid mutating original
      delete newUser.partners;
      return newUser;
    }),
    null,
    2 // pretty-print with indentation
  ),
  "utf8");

  // Sync to MongoDB
  db.saveUserToDB(newUser);
  
  var command ={entryparams:{fieldName:"user_info",operation:"add_user_info"},
   command:newUser};
         
  roomUpdates(req,room,command);
  
  res.status(200).json({ message: 'User registered successfully' });
});

router.get('/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
    //console.log(req.headers);
  const token = authHeader && authHeader.split(' ')[1];
  const username = authHeader && authHeader.split(' ')[0];
  
  const userFound = req.app.locals.sessions.find(user=> user.username == username && user.currentToken == token && JSON.stringify(user.useragent) == JSON.stringify(req.useragent));
  if(userFound)
  {
    userFound.hasFinished = true;
    var index2  = req.app.locals.intervals.findIndex(obj=> obj.session == userFound);
    if(index2>=0)
    {
      clearTimeout(req.app.locals.intervals[index2].timeoutValue);
      req.app.locals.intervals.splice(index2,1);
    }	
    res.status(200).json({message:"Vous êtes déconnectés avec succès."});
    const value = req.app.locals.sessions.findIndex(user => user == userFound);
    if(value>=0)
    req.app.locals.sessions.splice(value,1); 	
  }
  else
  {
    	res.status(404).json({message:"Utilisateur non retrouvé"});
  }
});
const generateQRCode =   async (req, res) => {
  const  {username,password}  = req.body;
  // Find user
  const user = req.app.locals.users.find(user => user.username === username);
  res.setHeader('Content-Type', 'text/html');
  if (!user) 
  {
    return res.status(400).send("<label><i className='bi-exclamation-diamond'></i>Impossible de retourner le QR UNAme</label>");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) 
  {
    return res.status(400).send("<label className='bi-exclamation-diamond'>Impossible de retourner le QR PWD</label>");  
  }
  console.log("user found for QR generation");
  if(user.secret)
  {
    console.log("Generating QR for existing secret"); 
    totp.generateQRCode(user.secret).then(html => res.status(200).send(html))
    .catch(err => res.status(200).send(err));
  }
  else
  {
    console.log("Generating QR for new secret");
      try{
        const secret = totp.generateSecret(user.username);
        user.secret = secret;
        fs.writeFileSync("./modules/Data/users.json", JSON.stringify(req.app.locals.users.map(user => {
          let newUser = user;
          delete newUser["partners"];
          return newUser;
        })));
        totp.generateQRCode(secret).then(html => { console.log("valid html returns",html);return res.status(200).send(html)})
        .catch(err => {console.log("invalid html returns",err);return res.status(200).send(err);});
        const oldUser = req.app.locals.users.find(user => user.username == user.username);
        const newUser = {...oldUser, secret: secret.base32};
        
        var command ={entryparams:{fieldName:"user_info",operation:"update_user_info"},
        command:{oldUser, newUser}};
        try{
          roomUpdates(req,room,command);
        }catch(err){console.log(err);}
      }
      catch( err){
        res.status(500).send("<label><i className=\"bi-exclamation-diamond\"></i>Erreur lors de la génération du secret TOTP</label>");
      }
    }
};
router.post('/loginQRStepOne', (req, res,next) => {
  const { username } = req.body;
  console.log(req.fullUrl)
  const user = req.app.locals.users.find(user => user.username === username);
  // Find user
  if( !user) {
    return res.status(400).json({ message: 'Invalid username' });
  }
  next();
},generateQRCode);


// Helper to record login audit entries
const recordLoginAudit = (user, req, newSession) => {
  try {
    const auditPath = path.join(__dirname, 'Data', 'login_audit.json');
    let auditList = [];
    if (fs.existsSync(auditPath)) {
      const data = fs.readFileSync(auditPath, 'utf8');
      if (data && data.trim().length > 0) {
        auditList = JSON.parse(data);
      }
    }
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const monthStr = dateStr.substring(0, 7);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((now - startOfYear) / (24 * 60 * 60 * 1000));

    const newAuditEntry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: now.toISOString(),
      date: dateStr,
      month: monthStr,
      year: now.getFullYear(),
      dayOfYear: dayOfYear,
      time: timeStr,
      username: user.username,
      name: user.name || user.username,
      email: user.email || '',
      role: user.role || (user.accountType === 'admin' ? 'Administrateur' : 'Utilisateur'),
      room: user.room || 'principal',
      accountType: user.accountType || 'user',
      type: newSession.type || 'basic',
      ip: ip.replace('::ffff:', ''),
      browser: req.useragent ? `${req.useragent.browser} ${req.useragent.version || ''} (${req.useragent.os || 'OS'})` : 'Navigateur Web',
      status: 'Succès'
    };

    auditList.unshift(newAuditEntry);
    // Keep max 500 records
    if (auditList.length > 500) {
      auditList = auditList.slice(0, 500);
    }
    fs.writeFileSync(auditPath, JSON.stringify(auditList, null, 2));

    // Save to MongoDB asynchronously
    db.recordAuditToDB(newAuditEntry);

    console.log(`[AUDIT] Login recorded for ${user.username} at ${timeStr} on ${dateStr} (Day of Year: ${dayOfYear})`);
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to record login audit:', err);
  }
};

const loginHandler = async (req, res) => {
  const { username, password, previousToken } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
  }

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

  // If user has 2FA enabled and this request is not already verified through step 2
  if (user.twoFactorEnabled === true && user.secret && req.originalUrl.indexOf("loginQRStepTwo") < 0) {
    return res.status(200).json({ require2FA: true, message: '2FA required' });
  }

  const foundSession = previousToken 
    ? req.app.locals.sessions.find(session => session.currentToken === previousToken || session.oldToken === previousToken)
    : null;

  // Generate JWT
  const secret = req.app.locals.secretKey || process.env.JWT_SECRET || 'msged_jwt_secret_key_default_2026';
  const token = jwt.sign({ username }, secret, { expiresIn: '10m' });
  const newSession = {
    date: new Date(Date.now()), 
    username: username, 
    password: password,
    currentToken: token, 
    oldToken: previousToken,
    oldTokens: [previousToken, ...(foundSession?.oldTokens ?? [])].filter(Boolean),
    type: user.type ? user.type : (user.accountType === "admin" ? "secret" : "basic"),
    accountType: user.accountType,
    room: user.room,
    hasFinished: false,
    useragent: req.useragent,
    commands: [],
    partners: req.app.locals.userPartners?.[username] ?? []
  };

  if (previousToken) {
    const index = req.app.locals.sessions.findIndex(session => session.currentToken === previousToken);
    if (index > -1) {
      const objFound = req.app.locals.sessions[index];
      req.app.locals.sessions.splice(index, 1);
      console.log("session deleted");

      const index2 = req.app.locals.intervals.findIndex(obj => obj.session === objFound);
      if (index2 >= 0) {
        clearTimeout(req.app.locals.intervals[index2].timeoutValue);
        req.app.locals.intervals.splice(index2, 1);
        console.log("timeout cleared");
      }
    }
    console.log('previous login token index is ' + index);
  }

  const timeoutValue = setTimeout(() => {
    newSession.hasFinished = true;
    newSession.commands.push({ message: "loginexperied", date: new Date(Date.now()) });
  }, 600000);
  
  req.app.locals.sessions.push(newSession);
  req.app.locals.intervals.push({ interval: timeoutValue, session: newSession });

  // Record login in audit log
  recordLoginAudit(user, req, newSession);

  res.status(200).json({ 
    message: 'Login successful', 
    token,
    room: user.room,
    type: newSession.type,
    accountType: newSession.accountType,
    imgSource: user.imgSource,
    name: user.name,
    identifier: user.identifier,
    email: user.email,
    twoFactorEnabled: !!user.twoFactorEnabled
  });
};

router.post('/loginQRStepTwo', async (req, res, next) => {
  const { username, TOTPtoken } = req.body;
  // Find user
  const user = req.app.locals.users.find(user => user.username === username);
  if (!user) {
    return res.status(400).json({ message: 'Identifiant invalide' });
  }
  if (!user.secret) {
    return res.status(400).json({ message: '2FA non configuré' });
  }
  
  const isVerified = totp.verifyToken(user.secret, TOTPtoken);
  if (!isVerified) {
    return res.status(400).json({ message: 'Code TOTP invalide' });
  }
  next();
}, loginHandler);

// Login route
router.post('/login', loginHandler);

// 2FA Management routes for user settings
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  const username = req.user.username;
  const user = req.app.locals.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  try {
    const secret = totp.generateSecret(user.username);
    user.pendingSecret = secret; // temporary until confirmed
    const qrHtml = await totp.generateQRCode(secret);
    res.status(200).json({ qrHtml, secret: secret.base32 });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la génération du QR Code' });
  }
});

router.post('/enable-2fa', authenticateToken, async (req, res) => {
  const username = req.user.username;
  const { code } = req.body;
  const user = req.app.locals.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  const secretToVerify = user.pendingSecret || user.secret;
  if (!secretToVerify) {
    return res.status(400).json({ message: 'Aucun secret 2FA en attente' });
  }

  const isVerified = totp.verifyToken(secretToVerify, code);
  if (!isVerified) {
    return res.status(400).json({ message: 'Code de vérification invalide' });
  }

  user.secret = secretToVerify;
  user.pendingSecret = undefined;
  user.twoFactorEnabled = true;
  fs.writeFileSync("./modules/Data/users.json", JSON.stringify(req.app.locals.users, null, 2));
  db.saveUserToDB(user);
  res.status(200).json({ message: '2FA activé avec succès', twoFactorEnabled: true });
});

router.post('/disable-2fa', authenticateToken, async (req, res) => {
  const username = req.user.username;
  const user = req.app.locals.users.find(u => u.username === username);
  if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

  user.twoFactorEnabled = false;
  user.secret = undefined;
  user.pendingSecret = undefined;
  fs.writeFileSync("./modules/Data/users.json", JSON.stringify(req.app.locals.users, null, 2));
  db.saveUserToDB(user);
  res.status(200).json({ message: '2FA désactivé avec succès', twoFactorEnabled: false });
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
      res.status(200).json({ users: req.app.locals.users.map(user2 => Object.fromEntries(Object.entries(user2).filter(([key])=> (key != 'password' && key != 'accessPassword')))) });
    else if(user.accountType != "admin" && req.app.locals.users)
    {
      res.status(200).json({ users: req.app.locals.users.filter(user2 =>
         user2.room && user2.room.startsWith(user.room))
         .map(user2 => Object.fromEntries(Object.entries(user2).filter(([key])=> (key != 'password' && key != 'accessPassword')))) });
    } 
    else
    {
      res.status(500).json({ message: 'User data not available' });
    }
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
});

// Admin endpoint: Fetch login audit records with today/month/year/day-of-year/live filters
router.get('/admin/login-audit', authenticateToken, (req, res) => {
  try {
    const username = req.user.username;
    const currentUser = req.app.locals.users.find(u => u.username === username);
    if (!currentUser || (currentUser.accountType !== 'admin' && currentUser.type !== 'secret')) {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
    }

    const auditPath = path.join(__dirname, 'Data', 'login_audit.json');
    let auditList = [];
    if (fs.existsSync(auditPath)) {
      const data = fs.readFileSync(auditPath, 'utf8');
      if (data && data.trim().length > 0) {
        try {
          auditList = JSON.parse(data);
        } catch (e) {
          auditList = [];
        }
      }
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const thisMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const thisYear = now.getFullYear();
    const startOfYear = new Date(thisYear, 0, 1);
    const todayDayOfYear = Math.ceil((now - startOfYear) / (24 * 60 * 60 * 1000));

    // Active live sessions in memory right now (active within last 30 minutes and not finished)
    const nowMs = Date.now();
    const activeLiveSessions = (req.app.locals.sessions || [])
      .filter(s => !s.hasFinished && s.username && (nowMs - new Date(s.lastActive || s.date || 0).getTime() < 30 * 60 * 1000))
      .map(s => {
        const u = req.app.locals.users?.find(user => user.username === s.username);
        const loginDate = s.date ? new Date(s.date) : new Date();
        return {
          id: 'live_' + s.username + '_' + (s.currentToken ? s.currentToken.substr(-8) : 'session'),
          timestamp: loginDate.toISOString(),
          date: `${loginDate.getFullYear()}-${pad(loginDate.getMonth() + 1)}-${pad(loginDate.getDate())}`,
          time: `${pad(loginDate.getHours())}:${pad(loginDate.getMinutes())}:${pad(loginDate.getSeconds())}`,
          username: s.username,
          name: u?.name || s.username,
          email: u?.email || '',
          role: u?.role || (s.accountType === 'admin' ? 'Administrateur' : 'Utilisateur'),
          room: s.room || 'principal',
          accountType: s.accountType || 'user',
          type: s.type || 'basic',
          ip: s.ip || 'En ligne',
          browser: s.useragent ? `${s.useragent.browser} ${s.useragent.version || ''} (${s.useragent.os || 'OS'})` : 'Navigateur Web',
          status: 'En ligne (Live)',
          isLive: true
        };
      });

    const liveUsernames = new Set(activeLiveSessions.map(s => s.username));

    const { date, month, year, dayOfYear, timeframe, search } = req.query;
    let filtered = auditList.map(item => ({
      ...item,
      isLive: item.date === todayStr && liveUsernames.has(item.username)
    }));

    // Timeframe filters
    if (timeframe === 'active_now') {
      filtered = activeLiveSessions;
    } else if (timeframe === 'today' || date === 'today') {
      filtered = filtered.filter(item => item.date === todayStr);
    } else if (timeframe === 'this_month' || month === 'current') {
      filtered = filtered.filter(item => item.date && item.date.startsWith(thisMonthStr));
    } else if (timeframe === 'this_year' || year === 'current') {
      filtered = filtered.filter(item => item.date && item.date.startsWith(String(thisYear)));
    } else {
      if (date && date !== 'all') {
        filtered = filtered.filter(item => item.date === date);
      }
      if (month && month !== 'all') {
        filtered = filtered.filter(item => item.date && item.date.startsWith(month));
      }
      if (year && year !== 'all') {
        filtered = filtered.filter(item => item.date && item.date.startsWith(String(year)));
      }
      if (dayOfYear) {
        const targetDay = parseInt(dayOfYear, 10);
        filtered = filtered.filter(item => {
          if (item.dayOfYear) return item.dayOfYear === targetDay;
          const d = new Date(item.timestamp || item.date);
          const s = new Date(d.getFullYear(), 0, 1);
          const day = Math.ceil((d - s) / (24 * 60 * 60 * 1000));
          return day === targetDay;
        });
      }
    }

    if (search && search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(item =>
        (item.username && item.username.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q)) ||
        (item.room && item.room.toLowerCase().includes(q)) ||
        (item.ip && item.ip.toLowerCase().includes(q)) ||
        (item.browser && item.browser.toLowerCase().includes(q))
      );
    }

    const availableDates = [...new Set(auditList.map(item => item.date).filter(Boolean))].sort().reverse();
    const availableMonths = [...new Set(auditList.map(item => item.date ? item.date.substring(0, 7) : null).filter(Boolean))].sort().reverse();
    const availableYears = [...new Set(auditList.map(item => item.date ? item.date.substring(0, 4) : null).filter(Boolean))].sort().reverse();

    const todayCount = Math.max(
      auditList.filter(item => item.date === todayStr).length,
      activeLiveSessions.length
    );
    const monthCount = Math.max(
      auditList.filter(item => item.date && item.date.startsWith(thisMonthStr)).length,
      todayCount
    );
    const yearCount = Math.max(
      auditList.filter(item => item.date && item.date.startsWith(String(thisYear))).length,
      monthCount
    );

    res.status(200).json({
      logs: filtered,
      activeSessions: activeLiveSessions,
      stats: {
        activeNowCount: activeLiveSessions.length,
        todayCount,
        monthCount,
        yearCount,
        allCount: Math.max(auditList.length, yearCount),
        todayDayOfYear
      },
      totalCount: filtered.length,
      allCount: auditList.length,
      availableDates,
      availableMonths,
      availableYears
    });
  } catch (err) {
    console.error('Error fetching login audit:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération du journal des connexions' });
  }
});

module.exports = router;
