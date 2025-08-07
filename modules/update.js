const { compareSync } = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
router.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    //console.log(req.headers);
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    if (token == undefined) return res.sendStatus(401);
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName).find( session => session.currentToken == token);
    if(!yourSession)
    {
        res.status(403).json({ message: 'Invalid username' });
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
router.delete('/',authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
   
    const {commands} = req.body;
    console.log("Inside router delete.");
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName).find( session => session.currentToken == token);

    if(!yourSession)
    {
        res.json({message:"You must login."});
        console.log("You must login.");
        return;
    }
    if(commands && commands instanceof Array)
    {
        console.log(JSON.stringify(yourSession.commands[0]) == JSON.stringify(commands[0]));
        /*console.log(yourSession.commands[0]);
        console.log("************************************");
        console.log(commands[0]);
        console.log("-------------------------------------");*/
        var withFilters = yourSession.commands.filter(command => !commands.find(paramCommand => JSON.stringify(paramCommand) == JSON.stringify(command)) );
        /*console.log(withFilters.length);
        console.log("-------------------------------------");*/
        const text = withFilters.length != yourSession.commands.length?(yourSession.commands.length-withFilters.length) +" elements deleted ":" 0 elements deleted";
        yourSession.commands = withFilters;
        console.log(text);
        //console.log(withFilters);
        res.json({message:text});
    }
    else
        res.status(404).send("You must include commands.");
});
// Fetch directories
router.get('/', authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName).find( session => session.currentToken == token);
    //console.log("Inside router get update.");
    //console.log(req.app.locals.sessions);
    if(!yourSession)
    {
        res.status(401).json({message:"You must login."});
        return;
    }
    const interval = setInterval(()=>{
        if(yourSession.commands.length > 0)
        {
            console.log(req.app.locals.sessions);
            res.json({message:"Il y a des mises à jours.",commands:yourSession.commands});
            clearInterval(interval);
        }
    },200);
});

module.exports = router;