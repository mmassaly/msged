const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const router = express.Router();
router.use(express.json());
// Signup route
router.post('/signup', async (req, res) => {
  const { name,username, password,room,identifier,accessType,accessPassword } = req.body;
  console.log(password);
  if(accessType && accessType == "secret" && req.secretPassword != accessPassword)
  {
    return res.status(400).json({ message: 'Le mot de passe pour le type top secret ne correspond pas' });
  }
  else if (!accessType || accessType == "basic")
  {
    return res.status(400).json({ message: 'Chemin invalide.' });
  }
  // Check if user already exists
  const existingUser = req.app.locals.users.find(user => user.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "L'utilisateur existe déjà" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store user
  req.app.locals.users.push({ name,username, password: hashedPassword,room:room,identifier,type:accessType,accessPassword });
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
  const newSession = {username:username, password:password,currentToken : token, oldToken: previousToken,type: user.type?user.type:user.accountType == "admin"?"secret":"basic", room: user.room,commands:[]};
/*console.log("************BEFORE************");
    console.log(req.app.locals.sessions);
  console.log("**********BEFORE**************");*/
  

  if( req.app.locals.sessions.
    find(session => session.currentToken == newSession.currentToken && session.oldToken == newSession.oldToken &&
      session.username == newSession.username &&  session.password == newSession.password && session.room == newSession.room) == undefined )
  { 
    const timeoutValue = setTimeout(()=>{newSession.commands.push({message:"loginexperied",date:new Date(Date.now())});},600000);
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
    
    console.log('new login token index is '+index);
    console.log(previousToken);
    
  }
  
  /*console.log("************AFTER************");
    console.log(req.app.locals.sessions);
  console.log("**********AFTER**************");*/
  res.status(200).json({ message: 'Login successful', token,room:user.room,type:newSession.type});
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

module.exports = router;