const path = require('path');

function roomUpdates(req,room,command)
{
    //console.log(req.app.locals.roomDic);
    console.log(room);
    const roomsReferenced = req.app.locals.roomDic[room];
    console.log("Rooms referenced...");
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
        console.log("session room "+session.room.replace("//", path.sep))
        if(command.isAdditionalCommand)
        {
            console.log("session room "+session.room);
            console.log("***************************");
        }
        try
        {
            if (roomsReferenced.find(roomInList => roomInList == session.room.replace("//", path.sep)) || session.room == room )
            {   
                //console.log("Added command ");
                //console.log(command);
                //console.log("to session ..........");
                //console.log(session);
                //console.log("to session ..........");
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

module.exports = roomUpdates;