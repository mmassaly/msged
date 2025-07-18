const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const router = express.Router();
router.use(express.json());
const intervals = [];
// Signup route
router.post('/signup', async (req, res) => {
  const { name,username, password,room,identifier } = req.body;
  console.log(password);
  // Check if user already exists
  const existingUser = req.app.locals.users.find(user => user.username === username);
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Store user
  req.app.locals.users.push({ name,username, password: hashedPassword,room:room,identifier });
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
  const newSession = {username:username, password:password, currentToken:token, oldToken: previousToken, room: user.room,commands:[]};

  const timeoutValue = setTimeout(()=>{newSession.commands.push({message:"loginexperied",date:new Date(Date.now())});},600000);
  intervals.push({interval:timeoutValue,session:newSession});
  /*console.log("************BEFORE************");
    console.log(req.app.locals.sessions);
  console.log("**********BEFORE**************");*/
  if(previousToken)
  {
    const index = req.app.locals.sessions.findIndex( session => session.currentToken == previousToken );
    if(index > -1)
    {
      const objFound = req.app.locals.sessions[index];
      req.app.locals.sessions.splice(index,1);
      console.log("session deleted");

      var index2  = intervals.findIndex(obj=> obj.session == objFound);
      if(index2)
      {
        clearTimeout(intervals[index2]);
        intervals.splice(index2,1);
        console.log("timeout cleared");
      }
    }
    
   
    console.log('new login token index is '+index);
    console.log(previousToken);
    
  }
  req.app.locals.sessions.push(newSession);
  /*console.log("************AFTER************");
    console.log(req.app.locals.sessions);
  console.log("**********AFTER**************");*/
  res.status(200).json({ message: 'Login successful', token,room:user.room });
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