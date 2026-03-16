const {router}= require("../retrievals");
const retrievalsRouter = router;
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
/*jest.mock("jsonwebtoken",() => ({
            verify: jest.fn()
}));*/
describe('testing /occupations',()=>{
    let app;
    let session;
    beforeEach(()=>{
        session = {
                 username: 'testuser',
                 password: 'pass123',
                 currentToken: 'mockedToken',
                 previousToken: null,
                 type: 'secret',
                 room: 'A1',
                 commands: []
               };
        app = express();
        app.use(express.json());
        app.locals.users = [
             { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
             { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
           ];
        app.locals.sessions = [
            session
        ];
        app.locals.occupations = ["A","B","Singer"];
        app.locals.intervals = [];
        app.locals.secretKey = 'testsecret';
        app.locals.roomDic = {"base/testSubject1":["base","base/testSubject1"]
            ,"base/testSubject2":["base","base/testSubject2"]
            ,"base":["base","base/testSubject1","base/testSubject2"]                
            };
        app.locals.cvDirs = 
        {   
            "base/testSubject1":{functionTitle:"Singer"},
            "base/testSubject2":{functionTitleTyped:"Singer"}
        };
        app.locals.sessions = [session,{ username: 'testuser1',
                 password: 'pass123',
                 currentToken: 'mockedToken',
                 previousToken: null,
                 type: 'secret',
                 room: 'base/testSubject2',
                 commands: []},
                 { username: 'testuser2',
                 password: 'pass123',
                 currentToken: 'mockedToken',
                 previousToken: null,
                 type: 'secret',
                 room: 'base/testSubject2',
                 commands: []}];
        app.use(retrievalsRouter); 
    });

    it("must return the values given to it",async ()=>{
        jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, session); // simulate successful verification
        });
        const res = await request(app).get('/occupations')
        .set('authorization', "testuser mockedToken")
        .set('test', "true")
        .send();
        expect(res.status).toBe(200);
        let resObj = JSON.parse(res.text);
        expect(resObj.occupations).toEqual(app.locals.occupations);
        //console.log(resObj);
        //console.log(session);
    });   
    
    it("posting new value",async()=>{
         jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, session); // simulate successful verification
        });
        const res = await request(app).post('/occupations')
        .set('authorization', "testuser mockedToken")
        .set('test', "true")
        .send({occupation:"Musician"});
        expect(res.status).toBe(200);
        expect(app.locals.occupations).toContain("Musician");
        /**
         *  - toEqual → deep equality
            - toBe → same reference
            - toContain → element presence
            - toHaveLength → size check
            - expect.arrayContaining([...]) → partial match
         */
    });
    it("editing occupations new value",async()=>{
         jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, session); // simulate successful verification
        });
        const res = await request(app).put('/occupations')
        .set('authorization', "testuser mockedToken")
        .set('test', "true")
        .send({occupation:"Musician",oldOccupation:"Singer"});
        expect(res.status).toBe(200);
        expect(app.locals.occupations).toContain("Musician");
        expect(app.locals.cvDirs["base/testSubject1"].functionTitle).toBe("Musician");
        expect(app.locals.cvDirs["base/testSubject2"].functionTitleTyped).toBe("Musician");
        /*  var command2 ={entryparams:{fieldName:"cv",operation:"edit_cv"},
             command:{put:[],push:[]}};
        */
        
             app.locals.sessions.forEach((asession,index)=>index >= 2?console.log(asession.commands[0].entryparams,asession.commands[0].command.put):console.log(""));
        /*var command ={entryparams:{fieldName:"occupations",operation:"edit_occupation"},
        command:{occupation,oldOccupation}};*/
           
        expect(app.locals.sessions[1].commands.find(command=> (command.entryparams.fieldName == "occupations"
            && command.entryparams.operation =="edit_occupation") && (command.command.occupation 
            && command.command.oldOccupation))).toBeDefined();
        
        expect(app.locals.sessions[1].commands.find(command=> ((command.entryparams.fieldName == "cv"
            && command.entryparams.operation =="edit_cv") && (command.command.put[0].value == "Musician" 
            && command.command.put[0].location  == "functionTitle"))
        
            || (app.locals.sessions[2].commands.find(command=> (command.entryparams.fieldName == "cv"
            && command.entryparams.operation =="edit_cv") && (command.command.put[0].value == "Musician" 
            && command.command.put[0].location  == "functionTitleTyped"))))).toBeDefined();
        

        /**
         *  - toEqual → deep equality
            - toBe → same reference
            - toContain → element presence
            - toHaveLength → size check
            - expect.arrayContaining([...]) → partial match
         */
    });

    it("must return the array free from the omitted value",async()=>{
        app.locals.occupations.push("Musician");
        expect(app.locals.occupations).toContain("Musician");
         jwt.verify.mockImplementation((token, secret, callback) => {
            callback(null, session); // simulate successful verification
        });
        const res = await request(app).delete('/occupations')
        .set('authorization', "testuser mockedToken")
        .set('test', "true")
        .send({occupation:"Musician"});
        expect(res.status).toBe(200);
        expect(app.locals.occupations).not.toContain("Musician");
    })

});