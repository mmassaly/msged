const express = require('express');
const jwt = require('jsonwebtoken');
const {roomUpdates} = require('./roomUtil');
const path = require('path');
const pathObj = require('path');
const router = express.Router();
const mime = require('mime-types');
const openAIPackage= require('./services/openAI');
router.use(express.json());
// In-memory storage for demonstration purposes

const fs = require('fs');

// Function to read a directory and map its structure
function mapDirectory(pathPrefix,folderPath,parentPath,req,start) {
    var dirrectory = path.join(pathPrefix,parentPath,folderPath);
    const exists = fs.existsSync(dirrectory);
  
    if(!exists)
    {
        fs.mkdirSync(dirrectory);
    }
    const stats = fs.statSync(dirrectory);
    if(folderPath.endsWith("Appel d'offre Janvier-Juin 2024"))
    {
        console.log("Folder path is Appel d'offre Janvier-Juin 2024 "+path.join(parentPath,folderPath));
        console.log(req.app.locals.secretFolders);
    }
    const mappedDirectory = {
      name: path.basename(folderPath),
      isSecret: req?req.app.locals.secretFolders.find(value=> value == path.join(parentPath,folderPath))?true:false:false,
      date: stats.mtime, // Last modified date
      year:stats.isDirectory()?undefined:stats.mtime.getFullYear(),
      isDirectory: stats.isDirectory(),
      type:stats.isDirectory()?undefined:path.basename(folderPath).split(".")[path.basename(folderPath).split(".").length-1],
      path: path.join(parentPath,folderPath),
      parentPath: parentPath,
      isArchived: req?req.app.locals.archives.find(value=> value == path.join(parentPath,folderPath))?true:false:false,
      isCV: req?req.app.locals.cvDirs.find(value=>path.join(parentPath,folderPath).startsWith(value))?true:false:false,
      //content: (stats.isDirectory())?undefined:fs.readFileSync(dirrectory),
      subdirectories: []
    };
    
    if (mappedDirectory.isDirectory)
    {
      const items = fs.readdirSync(dirrectory);
      mappedDirectory.subdirectories = items.map(item =>
        mapDirectory(pathPrefix,item,path.join(parentPath,folderPath),req,start)
      ).filter(item => item !== undefined);
      if(start)
        RecursiveSplitTest2(mappedDirectory.path,req.app.locals.roomDic);
      
        if(mappedDirectory.isArchived)
        {
            setKeyValueofSubdirectories(mappedDirectory,"isArchived",true);
        }
        if(parentPath =="principal")
        {
            var name = path.basename(folderPath);
            if(req.app.locals.departements.findIndex(value=> value == name) < 0)
            {
                req.app.locals.departements.push(name);
                fs.writeFileSync('./modules/Data/departements.json',JSON.stringify(req.app.locals.departements));
            }
        }
    }
    /*else if(mappedDirectory.isCV)
    {
        //CV section get the reading then get the Object for description
        openAIPackage.run(mapDirectory.path,req.app.locals.occupations).then(response=>{ 
            response.cvObject;
            response.cvUpdateCommands.parentPath = parentPath;
            response.cvUpdateCommands.path = path.join(parentPath,folderPath);
            putCVDir({parentPath:mappedDirectory.parentPath,
            fullName:response.cvObject.personalDetails.fullName,
            prefix:response.cvObject.personalDetails.prefix,
            functionTitle:response.cvObject.personalDetails.functionTitle,
            functionTitleTyped:response.cvObject.personalDetails.functionTitleTyped,
            competencies:response.cvObject.competencies,
            experiences:response.cvObject.experience,
            degrees:response.cvObject.degrees},undefined);
        }).catch(err=>{console.error(err)});
    }*/
    return ((req.session && req.session.type == "secret" && mappedDirectory.isSecret) ||!mappedDirectory.isSecret )? mappedDirectory: undefined ;
  }
function readSize(path)
{
    if(fs.existsSync(path))
    {
       return  fs.statSync(path).size;
    }
    return undefined;
}
function readFile(path)
{
    if(fs.existsSync(path))
    return fs.readFileSync(path);
    return undefined;
}  

function readFile2(path)
{
    if(fs.existsSync(path))
    return fs.createReadStream(path);
    return undefined;
}  

function writeFile(path,data)
{
    if(fs.existsSync(path))
    return fs.writeFileSync(path,data);
    return undefined;
}  

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    //console.log(req.headers);
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    if (token == undefined) return res.sendStatus(401);
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName).find( session => session.currentToken == token);
    if(!yourSession)
    {
        res.sendStatus(403);//json({ message: 'Invalid username' });;
        return;
    }  
    jwt.verify(token, req.app.locals.secretKey, (err, user) => {
        if (err){ 
            return res.sendStatus(403);
        }//json({ message: 'Token not matched' });;
        req.user = user;
        req.session = yourSession;
        next();
    });
};
router.get('/CV',authenticateToken,(req,res)=>{
    res.json({cvDirs:req.app.locals.cvDirs,cvDetailed:req.app.locals.cvs});
});

const postCVDir = (req,res)=>{
    const {givenPath, parentPath} = req.body;
    const index = req.app.locals.cvDirs.findIndex(value=> value == givenPath);
    
    if(index < 0)
    {
        req.app.locals.cvDirs.push(givenPath);
        fs.writeFileSync('./modules/Data/cvFolders.json',JSON.stringify(req.app.locals.cvDirs));
        
        var command = {entryparams:{fieldName:"CV",operation:"set_cv_dir"},
            command:{path:givenPath,name:path.basename(givenPath),
                isDirectory:fs.statSync(givenPath).isDirectory(),parentPath:path.dirname(givenPath),
                isCV:true
        }};
        try
        {
            mapDirectory("./",givenPath,"",req);
            roomUpdates(req,givenPath,command);
        }
        catch(err)
        {
            //res.status(500).type("text").write(err.message +"\n"+err.stack);
            return response.status(500).json( {message:"Il y a eu une erreur ",message2:err.message});
        }
        res.json({message:`${givenPath} est maintenant un dossier pour CVs.`});
    }
    else 
    {
        req.app.locals.cvDirs.splice(index,1);
        fs.writeFileSync('./modules/Data/cvFolders.json',JSON.stringify(req.app.locals.cvDirs));
        var command = {entryparams:{fieldName:"CV",operation:"set_cv_dir"},
            command:{path:givenPath,name:path.basename(givenPath),
                isDirectory:fs.statSync(givenPath).isDirectory(),parentPath:path.dirname(givenPath),
                isCV:false
        }};
        try
        {
            mapDirectory("./",givenPath,"",req);
            roomUpdates(req,givenPath,command);
        }
        catch(err)
        {
            //res.status(500).type("text").write(err.message +"\n"+err.stack);
            return response.status(500).json( {message:"Il y a eu une erreur ",message2:err.message});
        }
        res.json({message:`${givenPath} est maintenant un dossier ordinaire`});
    }
};
const openAIChargeCV = (req,res)=>{
    const {givenPath, parentPath} = req.body;
    console.log(givenPath,parentPath);
    openAIPackage.processPDFwithGemini(givenPath,req.app.locals.occupations).then(response=>{
        console.log(response);
        return putCVDir({body:{parentPath:parentPath,givenPath:givenPath,fullName:response.cvObject.personalDetails.fullName,
            prefix:response.cvObject.personalDetails.prefix,
            functionTitle:response.cvObject.personalDetails.functionTitle,
            functionTitleTyped:response.cvObject.personalDetails.functionTitleTyped,
            competencies:response.cvObject.competencies,
            experiences:response.cvObject.experience,
            degrees:response.cvObject.degrees}},undefined);
    }).then(value=> value).then(value=>{console.log("CV chargé avec succès");
        res.status(200).json({message:"CV chargé avec succès!"});}).catch(err=>{console.error(err);
        res.status(500).json( {message:`Il y a eu une erreur ${err.message}`});
    });
};
const putCVDir = (req,res)=>{
    const {givenPath,parentPath,fullName,prefix,functionTitle,
        functionTitleTyped,competencies,experiences,degrees} = req.body;
    
    var command = {entryparams:{fieldName:"CV",operation:"upload_cv"},
            command:{path:givenPath,name:path.basename(givenPath),
                isDirectory:fs.statSync(givenPath).isDirectory(),parentPath:path.dirname(givenPath),
                push:[{location:"competencies",value: competencies}
                    ,{location:"degrees",value: degrees}
                    ,{location:"experiences", value: experiences}]
                ,put:[{location:"fullName", value: fullName},{location:"prefix",value:prefix},{location:"functionTitle",value:functionTitle}
                    ,{location:"functionTitleType",value:functionTitleTyped}]
    }};
        
        var cvInMemory = req.app.locals.cvs[givenPath];
        if(!cvInMemory)
        {
            cvInMemory = {competencies:[],degrees:[],experiences:[]};
            req.app.locals.cvs[givenPath] = cvInMemory;
        }

        cvInMemory.path = givenPath?givenPath:"";
        cvInMemory.fullName = fullName?fullName:"";
        cvInMemory.prefix = prefix?prefix:"";
        cvInMemory.functionTitle = functionTitle?functionTitle:"";
        cvInMemory.functionTitleTyped = functionTitleTyped?functionTitleTyped:"";
        //cvInMemory.competencies.push(...competencies);
        //cvInMemory.degrees.push(...degrees);
        //cvInMemory.experiences.push(...experiences);
        
        cvInMemory.competencies = competencies;
        cvInMemory.degrees = degrees;
        cvInMemory.experiences = experiences;
        
        if(!res)
        {
            cvInMemory.chargedFromAI = true;
            command.command.put.push({location:"chargedFromAI",value:true});
        }
        else
        {
            cvInMemory.chargedByUser = true;
            command.command.put.push({location:"chargedByUser",value:true});
        }

        if(!cvInMemory.changes)
            cvInMemory.changes = [];
        
        cvInMemory.changes.push(command);
        
        try
        {
            fs.writeFileSync('./modules/Data/cvs.json',JSON.stringify(req.app.locals.cvs));
            if(res)
            {
                mapDirectory("./",parentPath,"",req);
            }
            roomUpdates(req,parentPath,command);
        }catch(err)
        {
            //return response.status(500).type('text').text(err.message);
            console.error(err);
            if(res)
                return res.status(500).json( {message:"Il y a eu une erreur ",message2:err.message});
        }
        if(res)
            res.json({message:"Le CV rattâché à "+fullName+" a été rattaché au dossier "+givenPath+"."});
        return;
    
};

router.post('/CV',authenticateToken,postCVDir);
router.put('/CV',authenticateToken,putCVDir);
router.post('/CV/charge',authenticateToken,openAIChargeCV);
// Fetch directories
router.get('/', authenticateToken, (req, res) => {
    //console.log(req.user);
    //console.log(req.app.locals.sessions);
    const directories =  mapDirectory("./",req.session.room.replaceAll("\\",path.sep)
    ,''
    ,req);
    //console.log(directories);
    //console.log(req.app.locals.roomDic);
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.json(directories? directories: {message:"Pas de dossier trouvé"});
});
router.get('/file', authenticateToken, (req, res) => {
   const filePath = path.join('./',decodeURIComponent(req.query.path));
   const mimeType = mime.lookup(filePath);
   console.log(mimeType);
   //mime.getType(filePath) causes issues
   //res.setHeader({'Content-Type':mimeType}); //causes issues in clients view
   res.set('Content-Type',mimeType);
   res.set('Content-Length',readSize(filePath));
   console.log(filePath);
   /*
   res.write(readFile(filePath));
   res.end();*/
   const readStream = readFile2(filePath);
   if(readStream)
    readStream.pipe(res);
   else{
        console.log(`File ${filePath} not found.`);
        res.write(undefined);
        res.end();
    }
   console.log("done");
});
router.get('/officefile', (req, res) => {
   const filePath = path.join('./',req.query.path);
   const mimeType = mime.lookup(filePath);
   //res.setHeader({'Content-Type':mimeType}); //causes issues in clients view
   console.log("------------------------------------get office file sending -------------------------------");
   console.log(mimeType);
   console.log("------------------------------------get office file sending -------------------------------");
   res.set('Content-Type',mimeType);
   console.log(filePath);
   /*
   res.write(readFile(filePath));
   res.end();*/
   const readStream = readFile2(filePath)
   if(readStream)
    readStream.pipe(res);
   else{
        res.write(undefined);
        res.end();
    }
   console.log("done");
});
router.put('/archiveFolder',authenticateToken,(req,res)=>{
    const {folderPath} = req.body;
    var fullPath = path.join('./',folderPath.replaceAll('\\',path.sep).replaceAll('/',path.sep));
    console.log("Archiving folder "+fullPath);
    if(!fs.existsSync(fullPath))
    {
        res.status(400).json({message:"Ce document n'existe pas."});
        return;
    }
    else if(!fs.lstatSync(fullPath).isDirectory())
    {
        res.status(400).json({message:"Ce document n'est pas un dossier."});
        return;
    }
    try{
        if( !req.app.locals.archives.find(value=> value == fullPath) )
        {
            req.app.locals.archives.push(fullPath);
            fs.writeFileSync('./modules/Data/archives.json',JSON.stringify(req.app.locals.archives));
            var command = {entryparams:{fieldName:"directories",operation:"archive_directory"},
            command:{path:fullPath,name:path.basename(fullPath),
                isDirectory:true,parentPath:path.dirname(fullPath),isArchived:true}};
            roomUpdates(req,fullPath,command);
        }
    }catch(err)
    {
        res.status(500).json({message:"Le dossier n'a pas pu être archivé."});
        return;
    }
    res.json({message:"Dossier archivé avec success!"});
});

router.post('/renameFolder',authenticateToken,(req,res)=>{
    const {oldPath,parentPath,name} = req.body;
    var newPath = path.join('./',parentPath.replaceAll('\\',path.sep).replaceAll('/',path.sep),name);
    console.log("Renaming folder from "+oldPath+" to "+newPath);
   
    if(fs.existsSync(newPath) && oldPath == newPath)
    {
        res.status(400).json({message:"Ce document existe déjà."});
        return;
    }
    else if(!fs.existsSync(oldPath))
    {
        res.status(400).json({message:"Ce document n'existe pas."});
        return;
    }
    else if(req.app.locals.archives.find(value=> value == oldPath))
    {
        res.status(400).json({message:"Ce document est un dossier archivé. Vous ne pouvez pas le renommer."});
        return;
    }
    try{
        fs.renameSync(oldPath,newPath);
        req.app.locals.roomDic = 
        RenameRoomsContainingOldPathWithNewPath(oldPath,newPath,req.app.locals.roomDic);
        req.app.locals.secretFolders = 
        RenameSecretsArrayContainingOldPathWithNewPathInArray(oldPath,newPath,req.app.locals.secretFolders);
        req.app.locals.sessions = req.app.locals.sessions.map(session => {
            if(session.room.startsWith(oldPath))
            {
                session.room = session.room.replace(oldPath,newPath);
            }
            return session;
        });
        req.app.locals.users = req.app.locals.users.map(user => {
            if(user.room.startsWith(oldPath))
            {
                user.room = user.room.replace(oldPath,newPath);
            }
            return user;
        });
	    
        /*console.log("-------------------------1------------------------");
        console.log(req.app.locals.secretFolders);
        console.log("--------------------------2-----------------------");
        console.log(req.app.locals.roomDic);
        console.log("--------------------------3-----------------------");
        console.log(req.app.locals.users);
        console.log("---------------------------4----------------------");
        console.log(req.app.locals.sessions);
        console.log("---------------------------5----------------------");*/

        writeFile("./modules/Data/secretFolders.json",JSON.stringify(req.app.locals.secretFolders));
        writeFile("./modules/Data/roomDic.json",JSON.stringify(req.app.locals.roomDic));
        writeFile("./modules/Data/users.json",JSON.stringify(req.app.locals.users));
        
        var command ={entryparams:{fieldName:"directories",operation:"rename_directory"},command:{oldPath:oldPath,path:newPath,name:path.basename(newPath),isDirectory:true,parentPath:path.dirname(newPath)}};
        roomUpdates(req,newPath,command);
        fs.writeFileSync("./modules/Data/roomDic.json",JSON.stringify(req.app.locals.roomDic));
        var commandSub =  command.command;
        var directories =  mapDirectory("./",newPath,"",req);
        //Object.assign(directories,commandSub);
        //command.command = directories;
        res.json({message:"Dossier renomé avec success!"});
    }catch(err)
    {
        //console.log(req.app.locals.roomDic);
        console.trace(err);
        res.status(500).json({message:err.message});
    }
});
router.post('/secretfolder',authenticateToken, (req, res) => {

    const { secretFolderPath,room,secretFolderParentPath,secret } = req.body;
    //req.app.locals.sessions.
    if(!req.app.locals.secretFolders)
        req.app.locals.secretFolders =[];
    console.log("Inside secretFolder....................................................");
    //console.log(req.app.locals.roomDic);
    const secretIndex = req.app.locals.secretFolders.findIndex(value => value == secretFolderPath);
    //console.log(    {secretFolderPath,room,secretFolderParentPath,secret} );
    if(!req.app.locals.secretFolders.find(value=> value == secretFolderPath))
    {
        req.app.locals.secretFolders.push(secretFolderPath);
        //console.log(req.app.locals.secretFolders);
        //console.log(JSON.stringify(req.app.locals.secretFolders));
        fs.writeFileSync('./modules/Data/secretFolders.json',JSON.stringify(req.app.locals.secretFolders));
    }
    else if( secretIndex >= 0)
    {
        req.app.locals.secretFolders.splice(secretIndex,1);
        fs.writeFileSync('./modules/Data/secretFolders.json',JSON.stringify(req.app.locals.secretFolders));
    }
    let folderpath = secretFolderPath.replaceAll('\\',path.sep).replaceAll('/',path.sep);
    let pPath = path.dirname(folderpath);
    
    var command = {entryparams:{fieldName:"directories",operation:(secretIndex>= 0)?"add_non_secret_directory":"remove_secret_directory"},command:{path:folderpath,
        name:path.basename(folderpath),isDirectory:true,parentPath:pPath,isSecret:(secretIndex>= 0)?false:true}};
    var commandSub =  command.command;
    var directories =  mapDirectory("./",folderpath,"",req);
    
    if(directories != undefined)
    {
        Object.assign(directories,commandSub);
        command.command = directories;
    }
    /*if(command.entryparams.operation == "add_non_secret_directory")
    {
        console.log("Adding non secret directory....................");
        console.log(`Brute parentPath is ${pPath} calculated parentPath is ${path.dirname(folderpath)} command parentPath ${command.command.parentPath}`);
        console.log("Adding non secret directory....................");
    }*/
    console.log(req.app.locals.roomDic);
    console.log(secretFolderPath);
    console.log(req.app.locals.roomDic[secretFolderPath]);
    roomUpdates(req,secretFolderPath,command);
    // If the secret matches, return the room dictionary
    res.status(200).json({OK:true});
    console.log("response sent>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
});
// Add a new directory
router.post('/', authenticateToken, (req, res) => {
    const {room,name, parentPath } = req.body;
    //console.log(room);
    //console.log(name);console.log(parentPath);
    var directories =  mapDirectory("./","principal","",req);
    if (parentPath) 
    {
        const parent =  recursiveFindDir(directories,parentPath);
        if (!parent) return res.status(400).json({ error: 'Parent directory not found' });
        const uploadPath = path.join("./",parent.path,name);
        //console.log(parent.path);
        //console.log(uploadPath);
        
        if( !req.app.locals.roomDic[uploadPath] )
        {
           req.app.locals.roomDic[uploadPath] = uploadPath.split(path.sep).reduce((acc,current,index)=> {acc.push(current);
                if(index > 0) acc[index] = path.join(...acc.slice(0,acc.length));return acc;
           },[]);
            
           if(req.app.locals.roomDic[uploadPath])
            {
                req.app.locals.roomDic[uploadPath].forEach( value=> {
                    if( !req.app.locals.roomDic[value] )
                    {
                        req.app.locals.roomDic[value] = [];
                    }
                });
            }
            //RecursiveSplitTest2(uploadPath,req.app.locals.roomDic);
        }
        else 
        {
            var stack = [];
            uploadPath.split(path.sep).forEach(dir=>{
                stack.push(dir);
                //var currentPath = (stack.length >1)?path.join(stack[stack.length-1],stack[stack.length-2]) :stack[0];
                //var currentPath = (stack.length >1)?path.join(stack[stack.length-1],stack[stack.length-2]) :stack[0];
                //What kind of room generates its parents like this...path.join(stack[stack.length-1],stack[stack.length-2])
                var currentPath = path.join(...stack.slice(0,stack.length)); 
                if( !req.app.locals.roomDic[currentPath] )
                {
                    req.app.locals.roomDic[currentPath] = [];
                } 
                if( !req.app.locals.roomDic[uploadPath] )
                {
                    req.app.locals.roomDic[uploadPath] = [currentPath];
                }
                if( !req.app.locals.roomDic[uploadPath].find( folder => folder == currentPath) )
                    req.app.locals.roomDic[uploadPath].push(currentPath);
            });
            //RecursiveSplitTest2(uploadPath,req.app.locals.roomDic);
        }
      
        try
        {
            fs.mkdirSync(uploadPath, { recursive: true });
            var command = {entryparams:{fieldName:"directories",operation:"add_directory"},command:{path:uploadPath,name:name,isDirectory:true,parentPath:parent.path}};
            roomUpdates(req,uploadPath,command);
            if(parent.path =="principal")
            {
                if(req.app.locals.departements.findIndex(value=> value == name) < 0)
                {
                    req.app.locals.departements.push(name);
                    fs.writeFileSync('./modules/Data/departements.json',JSON.stringify(req.app.locals.departements));
                }
            }
        }catch(err)
        {
            res.status(500).json({message:err});
        }
    }
    else {
        const uploadPath = path.join("./", 'principal',name);
        req.app.locals.roomDic[uploadPath] =[uploadPath];
        
        if(name!= "principal")
            req.app.locals.roomDic[uploadPath].push("principal");
        try{
        fs.mkdirSync(uploadPath, { recursive: true });
            var command = {entryparams:{fieldName:"directories",operation:"add_directory"}
                ,command:{path:uploadPath,name:name,isDirectory:true,parentPath:parent.path}};
                roomUpdates(req,uploadPath,command);
            
            if(req.app.locals.departements.findIndex(value=> value == name) < 0)
            {
                req.app.locals.departements.push(name);
                fs.writeFileSync('./modules/Data/departements.json',JSON.stringify(req.app.locals.departements));
            }
            
        }catch(err)
        {
            res.status(500).json({message:err});
        }
    }
    try{
        //console.log(req.app.locals.roomDic);
        writeFile("./modules/Data/roomDic.json",JSON.stringify(req.app.locals.roomDic));
        res.json({ message: 'Directory added successfully!' });
    }
    catch(err)
    {
        res.status(500).json({message:err});
    }
});

var RecursiveSplitTest2 = (pathstr,roomDic)=>
{
    var arr = pathstr.split(path.sep);
    let length = arr.length-1;
    if(length == 0)
        roomDic[pathstr] = [pathstr];
    while( length > 0)
    {
        
        var currentPath = path.join(...arr.slice(0,length));
        if ( !roomDic[pathstr] )
        {
            roomDic[pathstr] = [pathstr,currentPath];
        } 
        else if( !roomDic[pathstr].find(v=> v == currentPath) )
        {
            roomDic[pathstr].push(currentPath);
        }
        RecursiveSplitTest2(currentPath,roomDic);
        --length;
    }
};
var RenameRoomsContainingOldPathWithNewPathInArray = (oldPath,newPath,array)=>
{
    console.log("-----------------11111--------------------");
    console.log(array);
    const returnValue = array.map(value=> value.replace(oldPath,newPath));
    if(!returnValue.find(value=> value == newPath))
        returnValue.push(newPath);
  
    console.log(returnValue);
    console.log("------------------11111----------------------");
    return returnValue;
};

var RenameSecretsArrayContainingOldPathWithNewPathInArray = (oldPath,newPath,array)=>
{
    const returnValue = array.map(value=> value.replace(oldPath,newPath));
    return returnValue;
};
var RenameRoomsContainingOldPathWithNewPath = (oldPath,newPath,roomDic)=>{
    const keys = Object.keys(roomDic);
    const arr = keys.filter(value => roomDic[value].find( value2 => value2.startsWith(oldPath)));
    arr.forEach(val=>{
        const contents = roomDic[val];
        roomDic[val] = contents.map(element=> element.replace(oldPath,newPath) );
    });
    keys.forEach(value => {
        if( value.startsWith(oldPath) )
        {
            var anewPath = value.replace(oldPath,newPath);
            roomDic[anewPath] = roomDic[value];
            roomDic[value] = undefined;
        }
    });
    const returnValue = Object.fromEntries(Object.entries(roomDic).filter(([_,value]) => value !== undefined));
    if(!returnValue[newPath])
    {
        RecursiveSplitTest2(newPath,returnValue);
    }
    return returnValue;
};

function deleteCVHelper(foundDir,req)
{
    if(foundDir.isCV)
    {
            const cvIndex = req.app.locals.cvDirs.
            findIndex(value=> value == foundDir.path);
            if(cvIndex >= 0)
            {
                req.app.locals.cvDirs.splice(cvIndex,1);
                fs.writeFileSync('./modules/Data/cvFolders.json'
                    ,JSON.stringify(req.app.locals.cvDirs));
                console.log(`Deleted CV folder ${foundDir.path}`);
            }
            if(req.app.locals.cvs[foundDir.path])
            {
                delete req.app.locals.cvs[foundDir.path];
                fs.writeFileSync('./modules/Data/cvs.json'
                    ,JSON.stringify(req.app.locals.cvs));
                    console.log(`Deleted CV data for ${foundDir.path}`);
            }
    }
}
// Delete a directory
router.delete('/', authenticateToken, (req, res) => {
    var { path,parentPath } = req.query;
   
    console.log("Deleting directory at path: ", decodeURIComponent(path)); 
    console.log("Deleting a directory with parent path: ", decodeURI(parentPath)); 
    path = decodeURIComponent(path);
    parentPath = decodeURIComponent(parentPath);
    const directories =  mapDirectory("./",parentPath,"",req);
    console.log(directories? Object.entries(directories):"No directories found");
    
    const removeDirectory = (dirs) => {
     
        const foundDir = recursiveFindDir(dirs,path);
        console.log("Found directory to delete: ", foundDir);
        if (foundDir && foundDir.path != "principal") {
            console.log("Attempting to delete directory: ", foundDir.path);
            try
            {
                fs.rmSync(pathObj.join("./", foundDir.path), { recursive: true, force: true });
                deleteCVHelper(foundDir,req);
                var command = {entryparams:{fieldName:"directories",operation:"delete_directory"}
                    ,command:{path:path,name:foundDir.name,isDirectory:true,parentPath:foundDir.parentPath}};
                roomUpdates(req,path,command);
                if(foundDir.parentPath == "principal" && req.app.locals.departements.findIndex(value=> value == foundDir.name) >= 0)
                {
                    req.app.locals.departements.splice(req.app.locals.departements.findIndex(value=> value == foundDir.name),1);
                    fs.writeFileSync('./modules/Data/departements.json',JSON.stringify(req.app.locals.departements));
                }
                console.log(`Directory ${foundDir.path} deleted successfully.`);
                return true;
            }catch(err)
            {
                console.error("Error deleting directory: ", err);
            }
        }
        else if (foundDir.path == "principal")
        {
            return "denied"    
        }
        return false;
    };
    const success = removeDirectory(directories);
    if ( !success ) 
    {
        return res.status(400).json({ error: 'Directory not found' });
    }
    else if ( success == "denied" )
    {
        return res.status(403).json({ error: 'Cannot delete principal directory' });
    }

    res.json({ message: 'Directory deleted successfully!' });
});

function recursiveFindDir (dir,givenPath){ 
    if(dir.path == givenPath)
        return dir;
    var subdirfound = dir.subdirectories.find(subdir =>{console.log(subdir.path+'='+givenPath+" is "+ (subdir.path == givenPath)); return subdir.path == givenPath});
    if(subdirfound !=  undefined)
    {
        return subdirfound;
    }
    
    var accumulation = dir.subdirectories.reduce((acc,curr)=> {acc.push(curr);return acc;},[]);
    var foundIntoAccumulation = undefined;
    accumulation.forEach(element => {
        if(foundIntoAccumulation == undefined)
            foundIntoAccumulation = recursiveFindDir(element,givenPath);
    });
    return foundIntoAccumulation;
}
const setKeyValueofSubdirectories = (dir,key,value)=>
{
  if(dir && dir.isDirectory && dir.subdirectories)
  {
    dir.subdirectories.forEach(subdir=>{
      subdir[key] = value;
      setKeyValueofSubdirectories(subdir,key,value);
    });
  }
}
module.exports = {router,recursiveFindDir,mapDirectory,writeFile
    ,readFile,RenameRoomsContainingOldPathWithNewPath,authenticateToken
    ,postCVDir,putCVDir,openAIChargeCV};
