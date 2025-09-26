const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const roomUpdates = require('./roomUtil');
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
    if (!token) return res.sendStatus(401);
    const yourSession = req.app.locals.sessions.filter(session => session.username == userName).find( session => session.currentToken == token);
    if(!yourSession)
    {
        res.sendStatus(403);return;
    }    
    jwt.verify(token, req.app.locals.secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
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
const checkTargetFolder = (req,res,next)=>{
    var {parentPath,folderName} = req.body;
    console.log(req.body);
    console.log(folderName+"..................");
    if(req.app.locals.archives.find(value=> folderName && folderName.startsWith(value) ) )
    {
        res.status(400).json({message:"Vous ne pouvez pas ajouter des fichiers dans un dossier archivé."});
        return;
    }
    next();
}
router.post('/', authenticateToken,checkTargetFolder, upload.array('files'), (req, res) => {
    //const folder = req.body.folder; // Get the folder to save into
    // Save metadata in the database (if necessary)
    //console.log(`Files uploaded to folder: ${folder}`);
    console.log("******************************************");
    console.log(req.body);
    req.on('data',(chunk)=> console.log(chunk));
    res.json({ message: 'Les fichiers sont chargés avec succès!' });
});

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
module.exports = router;