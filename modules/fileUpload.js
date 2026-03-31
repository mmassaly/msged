const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const {roomUpdates, allRoomUpdated} = require('./roomUtil');
const router = express.Router();
const mime_lookup = require('mime-types');
const fs = require('node:fs');

// ✅ Middleware to parse JSON and URL-encoded bodies
router.use(express.json({ limit: '10gb' }));
router.use(express.urlencoded({ extended: true,limit: '10gb' }));

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const userName = authHeader && authHeader.split(' ')[0];
    //console.log(token,userName,req.app.locals.sessions.filter(session => session.username == userName));
    if (!token) return res.sendStatus(401);
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName)
    .find( session => session.currentToken == token || session.oldToken == token || session.oldTokens?.find(atoken=> atoken == token)  );
    if(!yourSession)
    {
        res.sendStatus(403);return;
    }    
    jwt.verify(token, req.app.locals.secretKey, (err, user) => {
        if (err) 
        {
            if(yourSession.oldToken == token && req.method == "POST")
            {
                req.user = user;
                next();
            }
            else
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};
const storage_2 = multer.diskStorage({limits: {
    fileSize: Infinity // This disables file size limit
    },
    destination:(req, file, cb)=>{
        console.log("Inside destination");
        let uploadPath = path.join("./","Data","partners");
        if(!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath,{ recursive: true });
        cb(null, uploadPath);
    }
    ,
    filename: (req, file, cb) => {
        let fileName = "empty.txt";
        if(file)
        {
            let date = new Date(Date.now());
            fileName = "base_"+date.toLocaleDateString().split('/').join('-')
            +"_"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()
            +"_base_"+Buffer.from(file.originalname, 'latin1').toString('utf8');
            
            console.log("Inside filename");
            req.uploadObject = {path:path.join('Data','partners',fileName)};
            var command = {entryparams:{fieldName:"partners"},
            command:{name:fileName,path:req.uploadObject.path,
                type: path.basename(file.originalname).split(".")[1],date:date,year:date.getFullYear()}};
            req.command = command;
        }
        cb(null,fileName);
    }
});
// Multer setup for file uploads
const storage = multer.diskStorage({
    limits: {
    fileSize: Infinity // This disables file size limit
    },
    destination: (req, file, cb) => {
        const {room,noFolder,loadFolder,paths,pathsObj} = req.body;
        var {parentPath,serverFolder} = req.body;//console.trace(req.body);
        
        if(!pathsObj)
        {
            req.body.pathsObj = JSON.parse(paths);
        }
        checkArchiveFolder(req);
        if(req.checkArchiveFolder)
        {
            console.log("Vous ne pouvez pas ajouter des fichiers dans un dossier archivé.");
            return cb(new Error("Upload rejected")); // ✅ signals error
        }
        //const uploadPath = path.join("./", 'principal', req.body.folderName);
        let folderName = "";
        //console.log(req.body.pathsObj);
        //console.log(req.body.pathsObj);
        var additionalcommandsFound = [];
        if(loadFolder)
        {
            console.log("inside load folder of destination..................."+file.originalname+".........");
            //console.trace(req.body.pathsObj);
            if(file.originalname)
            {
                var obj;
                try
                {
                    obj = req.body.pathsObj[Buffer.from(file.originalname, 'latin1').toString('utf8')].find(v=> !v.fileconsumed);        
                }
                catch(err)
                {
                    console.trace(Buffer.from(file.originalname, 'latin1').toString('utf8'));
                    try
                    {
                        obj = req.body.pathsObj[file.originalname].find(v=> !v.fileconsumed);
                    }
                    catch(err2)
                    {
                        console.trace(file.originalname);
                    }
                }
                if(obj)
                {
                    obj.consumed = true;
                    //obj.path
                    //Buffer.from(obj.path, 'latin1').toString('utf8')
                    //console.log(file.originalname);
                    //console.log(Buffer.from(file.originalname, 'latin1').toString('utf8'));
                    //console.log(obj.path);
                    //console.log(Buffer.from(obj.path, 'latin1').toString('utf8'));
                    split_array = ['principal'].concat(((obj.path.indexOf("principal") == 0)?obj.path.replace("principal",""):obj.path).replaceAll('/','\\').split('\\'));
                    if(split_array.length > 1)
                    {       
                        const anArr = split_array.slice(0,split_array.length-1);
                        folderName =  path.join(...anArr);
                        const slice = split_array.slice(1,split_array.length-1);
                        if(split_array.length > 2)
                        {
                            const arr2 = split_array.slice(1,split_array.length-2);
                            var str = path.join(...arr2);
                            parentPath = str;
                        }
                        else
                        {
                            parentPath = folderName;
                        }
                        parentPath = split_array.slice(0,split_array.length-1);
                        const slices = slice.map((folderName, index) => ({ entryparams:
                        {fieldName:"directories",operation:"add_directory"},
                            command:{
                                parentPath: path.join(...split_array.slice(0, index + 1)),
                                path: path.join(...split_array.slice(0, index + 2)),
                                isDirectory: true,
                                name: folderName
                            }
                        }));
                       additionalcommandsFound = [...slices];
                    }
                    else
                    {
                        folderName = split_array[0];
                        parentPath = folderName;
                    }
                }
                else
                {
                    console.trace("returning");
                    return;
                }
            }
            else
            {
                console.trace("returning");
                return;
            }
        }
        else if(noFolder)
        {
            var split_array = Buffer.from(file.originalname, 'latin1').toString('utf8').split('_');
            //split_array = file.originalname;
            split_array = (split_array.length > 1?split_array.slice(0,split_array.length-1):[]);
            folderName = path.join(room,...split_array);
            //console.trace(folderName);
            split_array = folderName.replaceAll('/','\\').split('\\');
            var afolderName;
            var aParentPath;
            if(split_array.length > 1)
            {       
                const anArr = split_array.slice(0,split_array.length-1);
                afolderName =  path.join(...anArr);
                const slice = split_array.slice(1,split_array.length-1);
                if(split_array.length > 2)
                {
                    const arr2 = split_array.slice(1,split_array.length-2);
                    var str = path.join(...arr2);
                    aParentPath = str;
                }
                else
                {
                    aParentPath = afolderName;
                }
                aParentPath = split_array.slice(0,split_array.length-1);
                        const slices = slice.map((folderName, index) => ({ entryparams:
                        {fieldName:"directories",operation:"add_directory"},
                            command:{
                                parentPath: path.join(...split_array.slice(0, index + 1)),
                                path: path.join(...split_array.slice(0, index + 2)),
                                isDirectory: true,
                                name: afolderName
                            }
                        }));        
                additionalcommandsFound = [...slices];
            }                    
            //console.trace(folderName+" folder name");
        }
        else if(serverFolder)
        {
            folderName  =  req.body.folderName.normalize();
        }
        else
        {
            console.trace("returning");
            return;
        }
        try{
            const uploadPath = path.join("./", folderName);
            //console.trace(uploadPath);
          
            fs.mkdirSync(uploadPath, { recursive: true });
            var parentPathOther = "";
            var stack = [];
                RecursiveSplitTest2(uploadPath,req.app.locals.roomDic);
                uploadPath.split(path.sep).forEach(dir=>{
                    stack.push(dir);
                    //var currentPath = (stack.length >1)?path.join(stack[stack.length-1],stack[stack.length-2]) :stack[0];
                    //What kind of room generates its parents like this...path.join(stack[stack.length-1],stack[stack.length-2])
                });

            var command = {entryparams:{fieldName:"directories",operation:"add_directory"},command:{path:uploadPath,name:path.basename(folderName),isDirectory:true,parentPath:parentPath?Buffer.from(parentPath, 'latin1').toString('utf8'):parentPath}};
            var parentPathOtherArray = stack.slice(0,stack.length-1);
            parentPathOther = path.join(...parentPathOtherArray);
            if(!command.command.parentPath)
                command.command.parentPath = parentPathOther; 
            stack = [];
            additionalcommandsFound.forEach(value=> {
                //console.log("*********************"); 
                //console.log(value);
                value.issAdditionalCommand = true;
                RecursiveSplitTest2(value.command.path,req.app.locals.roomDic);
                roomUpdates(req,value.command.path,value);
                //console.log("*********************");
            });

            if( command.parentPath != command.path )
                roomUpdates(req,uploadPath,command);
            cb(null, uploadPath);// Save to 'uploads' folder
        }
        catch(err)
        {
            console.log(err);
        }
    },
    filename: (req, file, cb) => {
        const {room,parentPath,noFolder,loadFolder,serverFolder,paths,pathsObj} = req.body;
        const date = new Date(Date.now());
        const year = date.getFullYear();
        let fileName = "base_"+date.toLocaleDateString().split('/').join('-')+"_"+date.getHours()+"-"+date.getMinutes()+"-"+date.getSeconds()+"_base_"+Buffer.from(file.originalname, 'latin1').toString('utf8');
        let folderName = "";

        checkArchiveFolder(req);
        if(req.checkArchiveFolder)
        {
            console.log("Vous ne pouvez pas ajouter des fichiers dans un dossier archivé.");
            return cb(new Error("Upload rejected")); // ✅ signals error
        }

        if(!pathsObj)
        {
            req.body.pathsObj = JSON.parse(paths);
            
            console.log("Problems here...............................in fileName");
        }
        if(loadFolder)
        {
            console.log("inside load folder of filename....................");
                if(file.originalname)
                {
                    var obj;
                    try
                    {
                        obj = req.body.pathsObj[Buffer.from(file.originalname, 'latin1').toString('utf8')].find(v=> !v.fileconsumed);
                        
                    }
                    catch(err)
                    {
                        console.trace(Buffer.from(file.originalname, 'latin1').toString('utf8'));
                        try
                        {
                            obj = req.body.pathsObj[file.originalname].find(v=> !v.fileconsumed);
                        }
                        catch(err2)
                        {
                            console.trace(file.originalname);
                        }
                    }
                    if(obj)
                    {
                        obj.fileconsumed = true;
                        split_array = ['principal'].concat(obj.path.replaceAll('/','\\').split('\\'));
                        //console.log(split_array);
                        //console.log(path.join(...split_array));
                        if(split_array.length > 1)
                        {       
                            const anArr = split_array.slice(0,split_array.length-1);
                            //console.log("**************************************");
                            //console.log(anArr);
                            //console.log(path.join(...anArr));
                            folderName =  path.join(...anArr);
                        }
                        else
                            folderName = split_array[0];

                        //console.log(folderName);
                        //console.log(obj.path);
                    }
                    else
                    {
                        console.trace("returning");
                        return;
                    }
                }
                else
                {
                    console.trace("returning");
                    return;
                }
        }
        else if(noFolder)
        {
            console.log("inside noFolder");
            var split_array = Buffer.from(file.originalname, 'latin1').toString('utf8').split('_');
            split_array = (split_array.length > 1?split_array.slice(0,split_array.length-1):[]);
            folderName = path.join(room,...split_array);
        }
        else if(serverFolder)
        {
            //console.log("inside server Folder");
            //console.log(req.body.folderName);
            folderName  =  req.body.folderName.normalize();
        }
        else
        {
            console.trace("returning");
            return;
        }
        //fileName  = Buffer.from(fileName, 'latin1').toString('utf8');
        //console.log(fileName);
        //console.log(folderName);
        cb(null, fileName);
        const pathJoin = path.join("./", folderName,fileName);
        var command = {entryparams:{fieldName:"directories",operation:"add_file"},command:{path:pathJoin,name:fileName,parentPath:path.join("./", folderName),type: path.basename(pathJoin).split(".")[1],date:date,year:year}};
        roomUpdates(req,folderName,command);
    }
});

const RecursiveSplit = (pathstr,req)=>
{
    var arr = pathstr.split(path.sep);
    let length = arr.length-1;
    while( length > 0)
    {
        var currentPath = path.join(...arr.slice(0,length));
        if ( !req.app.locals.roomDic[currentPath] )
        {
            req.app.locals.roomDic[currentPath] = [pathstr];
        } 
        else
        {
            req.app.locals.roomDic[currentPath].push(pathstr);
        }
        RecursiveSplit(currentPath,req);
        --length;
    }
}
// 'a\\b\\c,\\d\\e\\f\\g'
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
}
// RecursiveSplitTest2(obj,obj2)
const upload = multer({ storage ,limits: {
    files: Infinity,
    parts: Infinity
  }});
const upload_2 = multer({ storage: storage_2 ,limits: {
    files: Infinity,
    parts: Infinity
  }});

  const checkArchiveFolder = (req)=>{
    var {folderName} = req.body;
    console.log("Checking target folder..........................");
    console.log(folderName);
    console.log(req.body);
    if(req.app.locals.archives.find(value=> folderName && folderName.startsWith(value) ) )
    {
        req.checkArchiveFolder = true;
        console.log("Vous ne pouvez pas ajouter des fichiers dans un dossier archivé.");
        return;
    }
    req.checkArchiveFolder = false;
    //next(); //not longer a middleware
}
router.delete('/partners',authenticateToken,(req,res)=>{
    const {name,path} = req.body;
    if(!name)
    {
        res.status(400).json({message:"Vous devez identifier le partenaire"});
        return;
    }
    const partner = req.app.locals.partners.find(partner=> partner.name == name && partner.path == path);
    if(partner)
    {
        try
        {
            if(fs.existsSync(path.join("./",partner.path)))
            {
                fs.unlinkSync(partner.path);
            }
            
            req.app.locals.partners = req.app.locals.partners.filter(partnerElement=> partnerElement !== partner);
            fs.writeFileSync(path.join("./","modules/Data/partners.json"),JSON.stringify(req.app.locals.partners));
            res.status(200).end();
            var command = {entryparams:{fieldName:"partners",operation:"remove_partner"}
                            ,command:{name:partner.name,path:partner.path,description:partner.description}};
            allRoomUpdated(req,command);
            return;
        }
        catch(err)
        {
            console.trace(err);
            res.status(500).json({message:err.message});
            return;
        }
    }
    res.status(404).json({"message":"Le partenaire n'as pas été retrouvé."});
});
router.put('/partners',authenticateToken,upload_2.single('file'),async(req,res,next)=>{
    const {name,newName,newDescription} = req.body;
    const partners = req.app.locals.partners;
    const partner = partners.find(element=> element.name == name);
    console.log("inside validy middleware",name,newName,newDescription,partners,partner);
    if(name && (newName || newDescription))
    {
        if(!partner)
        {
            res.status(404).end();
            return;
        }
        try
        {
            fs.unlinkSync(path.join('./',partner.path));
        }
        catch(err)
        {
            console.trace(err);
            res.status(500).end();return;
        }
        console.log("inside validy middleware-calling next");
        next();
        return;
    }
    res.status(403).end();
},(req,res)=>{
    const {name,newName,newDescription,path} = req.body;
    const uploadObject = req.uploadObject;
    
    uploadObject.name = newName;
    uploadObject.description = newDescription;
    
    let partners = req.app.locals.partners;
    let partner = partners.find(partner=> partner.name == name && partner.path == path);
    req.app.locals.partners = partners.filter(partner=> partner.name !== name);
    req.app.locals.partners.push(uploadObject);
    //console.trace(partners);
    try
    {
        req.command.entryparams.operation = "edit_partner";
        req.command.command.newPath = uploadObject.path;
        req.command.command.path = partner?.path;
        req.command.command.newName = newName;
        req.command.command.newDescription = newDescription;
        req.command.command.name = name;
        fs.writeFileSync("./modules/Data/partners.json",JSON.stringify(partners));
        allRoomUpdated(req,req.command);
        if(fs.existsSync(path.join("./","Data/partners/empty.txt")))
            fs.unlinkSync(path.join("./","Data/partners/empty.txt"));
    }
    catch(err)
    {
        res.status(500).end();
        return;
    }
    res.status(200).end();
});
router.post('/partners',authenticateToken,upload_2.single('file'),(req,res)=>{
    const {name,description} = req.body;
    const uploadObject = req.uploadObject;
    uploadObject.name = name;
    uploadObject.description = description;
    const partners = req.app.locals.partners;

    if(partners.find(partner=> partner.name == name))
    {
        if(fs.existsSync( path.join("./",uploadObject.path)) )
            try
            {
                fs.unlinkSync( path.join("./",uploadObject.path) );
            }
            catch(err)
            {

            }
        res.status(404).end();
        return;
    }
    else
    {
        
        partners.push(uploadObject);
        console.trace(uploadObject,partners);
        fs.writeFileSync("./modules/Data/partners.json",JSON.stringify(partners));    
        req.command.entryparams.operation = "add_partner";
        req.command.command.description = description;
        req.command.command.name = name;
        allRoomUpdated(req,req.command);
    }
    res.status(200).end();
});
router.post('/', authenticateToken, upload.array('files'), (req, res) => {
    //const folder = req.body.folder; // Get the folder to save into
    // Save metadata in the database (if necessary)
    //console.log(`Files uploaded to folder: ${folder}`);
    console.log("******************************************");
    console.log(req.body);
    //req.on('data',(chunk)=> console.log(chunk));
    
    if(req.body.checkArchiveFolder)
        res.status(400).
            json({message:"Vous ne pouvez pas ajouter des fichiers dans un dossier archivé."});
    else    
        res.json({ message: 'Les fichiers sont chargés avec succès!' });
});

function deleteCVHelper(path,req)
{
    const cvIndex = req.app.locals.cvDirs.
    findIndex(value=> value == path);
    if(cvIndex >= 0)
    {
        req.app.locals.cvDirs.splice(cvIndex,1);
        fs.writeFileSync('./modules/Data/cvFolders.json'
            ,JSON.stringify(req.app.locals.cvDirs));
        console.log(`Deleted CV folder ${path}`);
    }
    if(req.app.locals.cvs[path])
    {
        delete req.app.locals.cvs[path];
        fs.writeFileSync('./modules/Data/cvs.json'
            ,JSON.stringify(req.app.locals.cvs));
            console.log(`Deleted CV data for ${path}`);
    }
    
}
router.delete('/', (req, res) => {
    const {filePath,parentPath} = req.body; // Get the folder to save into
    // Save metadata in the database (if necessary)
    
    //console.log(`Files uploaded to folder: ${folder}`);
    if(filePath  && parentPath && fs.existsSync(path.join("./",filePath)))
    {
        if( req.app.locals.archives.find(value=> path.join("./",filePath).startsWith(value) ) )
        {
            res.status(400).json({message:"Ce document est un fichier archivé. Vous ne pouvez pas le supprimer."});
            return;
        }
        try{
        fs.unlinkSync(filePath);
            var command = {entryparams:{fieldName:"directories",operation:"remove_file"}
            ,command:{path:filePath,name:path.basename(filePath),parentPath:parentPath}};
            deleteCVHelper(filePath,req);
            roomUpdates(req,parentPath,command);
        }catch(err)
        {
            res.status(500).json({message: `${filePath} n'a pu être enlevé!`});
            return;
        }
        res.json({ message: `${filePath} a été enlevé!`});
        return;
    }
    else if(filePath && parentPath)
    {
        res.status(404).json({ message: `${filePath} est introuvable!`});
        return;
    }
    res.status(404).json({ message: 'Vous devez envoyer un chemin valide!' });
});
router.post('/json', authenticateToken, (req, res) => {
    //const folder = req.body.folder; // Get the folder to save into
    // Save metadata in the database (if necessary)
    //console.log(`Files uploaded to folder: ${folder}`);
    console.log("******************************************");
    console.log(req.body);
    req.on('data',(chunk)=> console.log(chunk));
    res.json({ message: 'Les fichiers sont chargés avec succès!' });
});
// Error handler
router.use((err, req, res, next) => {
    console.log(err);
    if (err.message === 'Upload rejected') {
    next();
  }
});

module.exports = router;