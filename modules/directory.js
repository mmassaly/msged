const express = require('express');
const jwt = require('jsonwebtoken');
const roomUpdates = require('./roomUtil');
const router = express.Router();
const mime = require('mime-types');
router.use(express.json());
// In-memory storage for demonstration purposes

const fs = require('fs');
const path = require('path');
const { type } = require('os');

// Function to read a directory and map its structure
function mapDirectory(pathPrefix,folderPath,parentPath) {
    var dirrectory = path.join(pathPrefix,parentPath,folderPath);
    const exists = fs.existsSync(dirrectory);
    if(!exists)
    {
        fs.mkdirSync(dirrectory);
    }
    const stats = fs.statSync(dirrectory);
    const mappedDirectory = {
      name: path.basename(folderPath),
      date: stats.mtime, // Last modified date
      year:stats.isDirectory()?undefined:stats.mtime.getFullYear(),
      isDirectory: stats.isDirectory(),
      type:stats.isDirectory()?undefined:path.basename(folderPath).split(".")[1],
      path: path.join(parentPath,folderPath),
      parentPath: parentPath,
      //content: (stats.isDirectory())?undefined:fs.readFileSync(dirrectory),
      subdirectories: []
    };
  
    if (mappedDirectory.isDirectory) {
      const items = fs.readdirSync(dirrectory);
      mappedDirectory.subdirectories = items.map(item =>
        mapDirectory(pathPrefix,item,path.join(parentPath,folderPath))
      );
    }
  
    return mappedDirectory;
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

// Fetch directories
router.get('/', authenticateToken, (req, res) => {
    console.log(req.user);console.log(req.session);
    const directories =  mapDirectory("./",req.session.room,req.session.room.startsWith("principal")? '':'principal');
    console.log(directories);
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.json(directories);
});
router.get('/file', authenticateToken, (req, res) => {
   const filePath = path.join('./',req.query.path);
   const mimeType = mime.lookup(filePath);
   //res.setHeader({'Content-Type':mimeType}); //causes issues in clients view
   res.set('Content-Type',mimeType);
   res.set('Content-Length',readSize(filePath));
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
router.get('/officefile', (req, res) => {
   const filePath = path.join('./',req.query.path);
   const mimeType = mime.lookup(filePath);
   //res.setHeader({'Content-Type':mimeType}); //causes issues in clients view
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

// Add a new directory
router.post('/', authenticateToken, (req, res) => {
    const {room,name, parentPath } = req.body;
    //console.log(room);
    //console.log(name);console.log(parentPath);
    var directories =  mapDirectory("./","principal","");
    console.log(directories);
    if (parentPath) 
    {
        const parent =  recursiveFindDir(directories,parentPath);
        if (!parent) return res.status(400).json({ error: 'Parent directory not found' });
        const uploadPath = path.join("./",parent.path,name);
        console.log(parent.path);
        console.log(uploadPath);
        
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
      
        try{
        fs.mkdirSync(uploadPath, { recursive: true });
        var command = {entryparams:{fieldName:"directories",operation:"add_directory"},command:{path:uploadPath,name:name,isDirectory:true,parentPath:parent.path}};
        roomUpdates(req,uploadPath,command);
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
        var command = {entryparams:{fieldName:"directories",operation:"add_directory"},command:{path:uploadPath,name:name,isDirectory:true,parentPath:parent.path}};
        roomUpdates(req,uploadPath,command);}catch(err)
        {
            res.status(500).json({message:err});
        }
    }
    try{
        console.log(req.app.locals.roomDic);
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
}

// Delete a directory
router.delete('/:room/:path', authenticateToken, (req, res) => {
    const { room,path } = req.params;
    const directories =  mapDirectory("./","principal","");
    const removeDirectory = (dirs) => {
        const founDir = recursiveFindDir(dirs,path);
        if (founDir !== -1) {
            try
            {
                fs.unlinkSync(path.join("./",foundDir.path));
                roomUpdates(req,room,"getdirUpdates");
                return true;
            }catch(err)
            {
            }
        }
        return false;
    };

    if (!removeDirectory(directories)) {
        return res.status(400).json({ error: 'Directory not found' });
    }

    res.json({ message: 'Directory deleted successfully!' });
});

function recursiveFindDir (dir,givenPath){ 
    if(dir.path == givenPath)
        return dir;
    var subdirfound = dir.subdirectories.find(subdir => subdir.path == givenPath);
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

module.exports = {router,recursiveFindDir,writeFile,readFile};