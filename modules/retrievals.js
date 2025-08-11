const url = require('url');
const express = require('express');
const fs = require('node:fs');

const router = express.Router();
router.use(express.json());
const jwt = require('jsonwebtoken');

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

router.get('/departements',authenticateToken,async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    try
    {
        if(req.app.locals.departements === undefined)
        {
            res.status(404).json({message:"No departements found."});
            return;
        }
        res.status(200).json(JSON.parse(req.app.locals.departements));
        return;
    }
    catch(err)
    {
        res.status(500).json({message:"erreure de configuration côté serveur",err});
    }
    
});

module.exports = router;