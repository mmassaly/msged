const path = require('path');

function allRoomUpdated(req,command)
{
    console.log( req.app.locals.sessions.length+" all these sessions ");
    req.app.locals.sessions.forEach(session => 
    {
        session.commands.push(command);
    });
}

function allRoomUpdatedTypePartner(req,command,partner)
{
    req.app.locals.sessions.forEach(session => 
    {
        if((session.accountType == "host" || session.accountType == "partner") && 
            (session.room.startsWith(command.command.newName) || req.app.locals.userPartners[session.username].find(apartner=> apartner == partner )))
            session.commands.push(command);
    });
}

function allRoomUpdatedExcludeTypePartner(req,command)
{
    req.app.locals.sessions.forEach(session => 
    {
        if((session.accountType != "host" && session.accountType != "partner"))
            session.commands.push(command);
    });
}   

function updateRoomandSessionofHostPartnerUser(req,name,newName){
    req.app.locals.sessions = req.app.locals.sessions.map(session => {
        if( (session.accountType == "host" || session.accountType == "partner") && session.room.startsWith(name))
        {
            session.room = session.room.replace(name,newName);
        }
        return session;
    });

    req.app.locals.users = req.app.locals.users.map(user => {
        if( (user.accountType == "host" || user.accountType == "partner") && user.room.startsWith(name))
        {
            user.room = user.room.replace(name,newName);
        }
        return user;
    });
}
function partnerRoomUpdates(req,partnerName,command)
{
    req.app.locals.users.filter(user=>{
        user.partners && user.partners.find(partner => partner == partnerName);
    }).forEach(user => {
        req.app.locals.sessions.filter(session => session.username == user.username).forEach(session => {
            session.commands.push(command);
        });
    });
}
function updateRoomsAndSessions(req,oldPath,newPath)
{
    req.app.locals.sessions = req.app.locals.sessions.map(session => {
        if( (session.accountType !== "host" && session.accountType !== "partner") && session.room.startsWith(oldPath))
        {
            session.room = session.room.replace(oldPath,newPath);
        }
        return session;
    });
    req.app.locals.users = req.app.locals.users.map(user => {
        if( (user.accountType !== "host" && user.accountType !== "partner") && user.room.startsWith(oldPath))
        {
            user.room = user.room.replace(oldPath,newPath);
        }
        return user;
    });
}        
function roomUpdates(req,room,command,checkSession = false,checkSessionUserName=undefined)
{
    if (!room) {
        allRoomUpdated(req, command);
        return;
    }
    const roomsReferenced = (req.app.locals.roomDic && req.app.locals.roomDic[room]) ? req.app.locals.roomDic[room] : [];
    if(command.isAdditionalCommand)
    {
        console.log("Looking for a session for additionalCommand***************");
        console.log(command);
    }
    
    if (!req.app.locals.sessions || !Array.isArray(req.app.locals.sessions)) return;

    req.app.locals.sessions.forEach(session => 
    {
        if(command.isAdditionalCommand)
        {
            console.log("session room "+session.room);
            console.log("***************************");
        }
        try
        {
            const isMatch = (Array.isArray(roomsReferenced) && roomsReferenced.find(roomInList => 
                roomInList.replace(/\\/g, path.sep).replace(/\/\//g, path.sep) == (session.room || '').replace(/\\/g, path.sep).replace(/\/\//g, path.sep)
            )) || session.room == room;

            if (isMatch)
            {   
                if(checkSession && checkSessionUserName)
                {
                    if(session.username != checkSessionUserName)
                    {
                        console.log("Skipping session for "+session.username);
                        return;
                    }
                }
                
                if (!session.commands) session.commands = [];
                session.commands.push(command);
                console.trace(session.commands);
                if ( command.isAdditionalCommand )
                    console.log("Found session with room "+session.room);
            }
            else if ( command.isAdditionalCommand )
            {
                console.log("Found nada..........");
                console.log("command room "+command.path);
                console.log(roomsReferenced);
            }
        }
        catch(err)
        {
            console.trace(err);
            console.log(room);console.log(roomsReferenced);
        }
    });
}


module.exports = {roomUpdates,allRoomUpdated,partnerRoomUpdates,updateRoomandSessionofHostPartnerUser
                            ,allRoomUpdatedExcludeTypePartner,updateRoomsAndSessions,allRoomUpdatedTypePartner};