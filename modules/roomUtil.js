function roomUpdates(req,room,command)
{
    console.log(req.app.locals.roomDic);
    console.log(room);
    const roomsReferenced = req.app.locals.roomDic[room];
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
    console.log("--------------------------");
    console.log(req.app.locals.sessions);
    console.log("--------------------------");*/
    
    req.app.locals.sessions.forEach(session => 
    {
        if(command.isAdditionalCommand)
        {
            console.log("session room "+session.room);
            console.log("***************************");
        }
        if (roomsReferenced.find(roomInList => roomInList == session.room) || session.room == room )
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
    });
    if ( command.isAdditionalCommand )
     console.log("Looking for a session for additionalCommand***************");
}

module.exports = roomUpdates;