const url = require('url');
const express = require('express');
const fs = require('node:fs');
const {allRoomUpdated,roomUpdates} = require('./roomUtil');
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
        let index = req.app.locals.occupations.indexOf(occupation);
        if(index >= 0)
        {
            req.app.locals.occupations.splice(index,1);       
            if(req.headers["test"] != 'true')
            {
                fs.writeFileSync("./modules/Data/occupations.json",
                    JSON.stringify(req.app.locals.occupations));//fs was not present
            }
            var command ={entryparams:{fieldName:"occupations",operation:"remove_occupation"},
                command:{occupation}};
            allRoomUpdated(req,command);
        }
    }
    res.sendStatus(200);
});

router.put('/occupations',authenticateToken,async(req,res)=>{
    const {oldOccupation,occupation} = req.body;
    if(req.app.locals.occupations.length  > 0)
    {
        req.app.locals.occupations = req.app.locals.occupations.map(element=> element == oldOccupation?occupation:element);
    }
    if(!req.app.locals.occupations.find(element=> element == occupation))
    {
        req.app.locals.occupations.push(occupation);
    }
    if(req.headers["test"] != 'true')
    {
        fs.writeFileSync("./modules/Data/occupations.json",JSON.stringify(req.app.locals.occupations));//fs was not present
    }
    
    var command ={entryparams:{fieldName:"occupations",operation:"edit_occupation"},
        command:{occupation,oldOccupation}};
    let entriesOfCvDic = Object.entries(req.app.locals.cvDirs);
    let write = false;
    
    //console.log(`${entriesOfCvDic.length} entries of cvDic`);

    if(entriesOfCvDic.length > 0)
    {
        entriesOfCvDic.forEach(([key,value])=>{      
        let confirmed = false;
        
        var command2 ={entryparams:{fieldName:"cv",operation:"edit_cv"},
            command:{put:[],push:[]}};
                
            if( value.functionTitle == oldOccupation)
            {
                value.functionTitle = occupation;
                command2.command.put.push({location:"functionTitle",value:occupation});
                confirmed = true;
                if(!write)
                    write = true;
            }
            if( value.functionTitleTyped == oldOccupation)
            {
                value.functionTitleTyped = occupation;
                command2.command.put.push({location:"functionTitleTyped",value:occupation});
                confirmed = true;
                if(!write)
                    write = true;
            }  
            
            //console.log(confirmed?"Modifications passed":"Modifications not passed");
            if(confirmed)
            {
                try
                {
                    roomUpdates(req,key,command2);
                }
                catch(err)
                {

                }
            }      
        });
    }
    allRoomUpdated(req,command);
    if(write)
    {
        try
        {            
            if(req.headers["test"] != 'true')
            {
                fs.writeFileSync('./modules/Data/cvs.json'
                    ,JSON.stringify(req.app.locals.cvs));
            }
        }
        catch(err)
        {
            console.error(err);
        }
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

const insertOccupationUtil = async(req,occupation)=>{
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
};
module.exports = {router,insertOccupationUtil};