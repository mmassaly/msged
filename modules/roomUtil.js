const path = require('path');

function allRoomUpdated(req,command)
{
    console.log( req.app.locals.sessions.length+" all these sessions ");
    req.app.locals.sessions.forEach(session => 
    {
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
        user.partners.find(partner => partner == partnerName);
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
    //console.log(req.app.locals.roomDic);
    //console.log(room);
    const roomsReferenced = req.app.locals.roomDic[room];
    console.log(roomsReferenced);
    //console.log(command);
    if(command.isAdditionalCommand)
    {
        console.log("Looking for a session for additionalCommand***************");
        console.log(command);
    }
    //console.log(req.app.locals.roomDic);
    //console.log(room);
    //console.log(req.app.locals.roomDic[room]);
    //console.log("Rooms referenced...");
    //console.log(roomsReferenced);
    //console.log("Rooms referenced...");
    /*console.log("Inside room updates");
    console.log(roomsReferenced);
    console.log("--------------------------");*/
    
  

    req.app.locals.sessions.forEach(session => 
    {
        //console.log("session room 1"+session.room.replace("//", path.sep));
        //console.log("session room 2"+session.room);
        //console.log("session room 3"+session.room.replace('\\',path.sep).replace("//", path.sep));
        if(command.isAdditionalCommand)
        {
            console.log("session room "+session.room);
            console.log("***************************");
        }
        try
        {
            if (roomsReferenced.find(roomInList => roomInList.replace('\\',path.sep) == session.room.replace('\\',path.sep).replace("//", path.sep)) || session.room == room )
            {   
                /*console.log("Added command.................");
                console.log(command);
                console.log("Added command.................");
                console.log("to session ..........");
                console.log(session);
                console.log("to session ..........");*/
                if(checkSession && checkSessionUserName)
                {
                    if(session.username != checkSessionUserName)
                    {
                        console.log("Skipping session for "+session.username);
                        return;
                    }
                }
                
                session.commands.push(command);
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
            throw err;
        }
    });
    if ( command.isAdditionalCommand )
     console.log("Looking for a session for additionalCommand***************");
}


module.exports = {roomUpdates,allRoomUpdated,partnerRoomUpdates,updateRoomandSessionofHostPartnerUser,updateRoomsAndSessions};