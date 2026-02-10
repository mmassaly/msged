const url = require('url');
const express = require('express');
const fs = require('node:fs');
const {allRoomUpdated} = require('./roomUtil');
const router = express.Router();
router.use(express.json());
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
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
         console.log("Inside jwt verify authentifications");  
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
        res.status(200).json(req.app.locals.departements);
        return;
    }
    catch(err)
    {
        res.status(500).json({message:"erreure de configuration côté serveur",err});
    }
});




router.get("/occupations",authenticateToken,async(req,res)=>{
    let occupations = req.app.locals.occupations;
    res.status(200).json({occupations});
});
router.delete("/occupations",authenticateToken,async(req,res)=>{
    const {occupation} = req.body;
    if(req.app.locals.occupations.includes(occupation))
    {
        req.app.locals.occupations.splice(1,req.app.locals.occupations.indexOf(occupation));       
        if(req.headers["test"] != 'true')
        {
            fs.writeFileSync("./modules/Data/occupations.json",
                JSON.stringify(req.app.locals.occupations));//fs was not present
        }
        var command ={entryparams:{fieldName:"occupations",operation:"remove_occupation"},
            command:{occupation}};
        allRoomUpdated(req,command);
    }
    res.sendStatus(200);
});
router.post("/occupations",authenticateToken,async(req,res)=>{
    const {occupation} = req.body;
    let last = occupation;
    if(req.app.locals.occupations.length  > 0)
    {
        let lastIndex = req.app.locals.occupations.length -1;
        last = req.app.locals.occupations[lastIndex];
        req.app.locals.occupations[lastIndex] = occupation;
    }    
    req.app.locals.occupations.push(last);
    if(req.headers["test"] != 'true')
    {
        fs.writeFileSync("./modules/Data/occupations.json",JSON.stringify(req.app.locals.occupations));//fs was not present
    }
    
    var command ={entryparams:{fieldName:"occupations",operation:"add_occupation"},
        command:{occupation}};
    allRoomUpdated(req,command);
    res.sendStatus(200);
});
module.exports = router;