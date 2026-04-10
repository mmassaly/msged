const router = require('../fileUpload');
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const { beforeEach } = require('node:test');

const authRoutes = router;

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe("POST/api/partners",()=>{
    
    beforeAll(()=>{
        app = express();
                app.use(express.json());
                app.locals = {};
                app.locals.secretKey = 'hashedSecret';
                app.locals.users = [   
                    { username: 'testuser1', password: "secret1", accountType: 'admin', room: 'A1',partners:[] },
                    { username: 'testuser2', password: "secret2", accountType: 'admin', room: 'A2',partners:[] }
                ];
                app.locals.partners = [];
                app.locals.sessions = [{username:"testuser1",password:"mockedHash-secret1",room:"A1",currentToken:"mockedToken-testuser1"
                    ,oldToken:undefined,oldTokens:[],commands:[]},
                {username:"testuser2",password:"mockedHash-secret2",room:"A2",currentToken:"mockedToken-testuser2"
                    ,oldToken:undefined,oldTokens:[],commands:[]}];
                app.locals.intervals = [];
                app.use(authRoutes);
                
                bcrypt.compare.mockImplementation((password, hash) => {
                    return true;
                });
                
                bcrypt.hash = jest.fn().mockImplementation(async (password, saltRounds) => {
                    return `mockedHash-${password}`;
                });
        
                jwt.verify.mockImplementation((token, secret,callback)=>
                {
                    callback(null, token == "mockedToken-testuser1"?{username:"testuser1",password:"mockedHash-secret1",room:"A1",currentToken:"mockedToken-testuser1"
                    ,oldToken:undefined,commands:[1]}: token == "mockedToken-testuser2" ? 
                    {username:"testuser2",password:"mockedHash-secret2",room:"A2",currentToken:"mockedToken-testuser2"
                    ,oldToken:undefined,commands:[2]}:undefined); // simulate successful verification
                });
                jwt.sign.mockImplementation((payload, secret, options)=>{
                    return "mockedToken-"+payload.username;
                });
    });

    it("posts partner",async ()=>{
        // const formdata  = new FormData();
        // const buffer = fs.readFileSync("./files/senelec.png");
        // formdata.set("name","SENELEC");formdata.set("description","Société nationale d'électricité du Sénégal");
        // formdata.append("file",new File([buffer],"senelec.png",{type:"image/png"}));
        const post = await request(app).post('/partners')
        .set('authorization', 'testuser1 mockedToken-testuser1')
        .field("name","SENELEC")
        .field("description","Société nationale d'électricité du Sénégal")
        .attach('file', './files/senelec.png');
        console.trace(post.statusCode);
        expect(fs.existsSync("./Data/partners")).toBe(true);
        //expect(fs.existsSync("./Data/partners/senelec.png")).toBe(true);
        expect(app.locals.partners.find(partner=> partner.name == "SENELEC")).toBeDefined();
        expect(post.status).toBe(200);
        expect(app.locals.sessions[0].commands.length > 0).toBe(true);
    });

    it("deletes partner",async ()=>{
        
        //expect(fs.existsSync("./Data/partners/base_26-03-2026_8-27-44_base_senelec.png")).toBe(true);
        expect(JSON.parse(fs.readFileSync("./modules/Data/partners.json")).find(partner=> partner.name == "SENELEC")).toBeDefined();
        expect(app.locals.partners.find(partner=> partner.name == "SENELEC")).toBeDefined();
        const deleteResponse = await request(app).delete('/partners')
        .set('authorization', 'testuser1 mockedToken-testuser1')
        .send({name:"SENELEC"});
        if(deleteResponse.headers["content-type"]?.toLowerCase().includes("application/json"))
            console.trace(JSON.parse(deleteResponse.text));
        expect(deleteResponse.statusCode).toBe(200);
        //expect(fs.existsSync("./Data/partners/base_26-03-2026_8-27-44_base_senelec.png")).toBe(false);
        expect(app.locals.partners.find(partner=> partner.name == "SENELEC")).toBeUndefined();
        expect(JSON.parse(fs.readFileSync("./modules/Data/partners.json")).find(partner=> partner.name == "SENELEC")).toBeUndefined();
    })

    it("modifies partner",async ()=>{
        app.locals.sessions[0].commands.splice(app.locals.sessions[0].commands.length,0);
        app.locals.sessions[0].partners = ["SENELEC"]; app.locals.sessions[0].room = "SENELEC"; 
        app.locals.sessions[0].accountType = "partner";
        app.locals.users[0].accountType = "partner";

        app.locals.users[0].partners = ["SENELEC"]; app.locals.users[0].room = "SENELEC";
        app.locals.userPartners = JSON.parse(fs.readFileSync("./modules/Data/userPartners.json"));
        
        app.locals.partners = [{name:"SENELEC",description:"Société nationale d'électricité du Sénégal"}];
        app.locals.partnersDic = {"SENELEC":[{path:"principal/Partners/projetdeforages.png",parentPath:"principal/Partners",fileName:"projetdeforages.png"}]};
        console.log(app.locals.partners);      
        const put = await request(app).put('/partners')
        .set('authorization', 'testuser1 mockedToken-testuser1')
        .field("name","SENELEC")
        .field("newName","SENEAU")
        .field("newDescription","Sénégalaise des eaux")
        .attach('file', './files/seneau.jpeg');
        //console.trace(post.statusCode);
        expect(fs.existsSync("./Data/partners")).toBe(true);
        //expect(fs.existsSync("./Data/partners/seneau.jpeg")).toBe(true);
        //expect(fs.existsSync("./Data/partners/senelec.jpg")).toBe(false);
        console.log(app.locals.userPartners);
        expect(app.locals.userPartners["testuser"].find(partner=> partner == "SENEAU" )).toBeDefined();
        //expect(put.status).toBe(200);
        console.log(app.locals.partnersDic["SENEAU"]);
        expect(app.locals.partnersDic["SENEAU"])
            .toEqual([{path:"principal/Partners/projetdeforages.png",parentPath:"principal/Partners",fileName:"projetdeforages.png"}]);
        expect(app.locals.sessions[0].commands.length > 0).toBe(true);
        expect(app.locals.sessions[0].room).toBe("SENELEC");
        expect(app.locals.users[0].room).toBe("SENELEC");
    });
});
describe("DELETE/api/upload",()=>
{
    let app;
    beforeAll(()=>{
       
        app = express();
        app.use(express.json());
        app.locals.users = [
        { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
        { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
        ];
        app.locals.sessions = [{ username: 'testuser', password: 'hashedpass'
            ,currentToken: 'accountToken',accountType: 'admin', room: 'A1' },
        ];
        app.locals.intervals = [];
        app.locals.roomDic = {Data:["Data"],"Data/testsFiles":["Data","Data/testsFiles"]};
        app.use(authRoutes);
        if(fs.existsSync("Data/testsFiles/A.txt"))
        {
            fs.unlink("Data/testsFiles/A.txt");
        }
    });
    //
    beforeEach(()=>{
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue('mockedToken');
    });
    
    it('should return 404 and for the case where the file in path is not existant ', async () => {
        
        const res = await request(app).delete('/')
        .set('Authorization', 'testuser accountToken')
        .send({filePath:"Data/testsFiles/A.txt",parentPath:"Data/testsFiles"});
        expect(res.statusCode).toBe(404);
        try
        {
            const respObj = JSON.parse(res.text); 
            expect(respObj.message).toBe("Data/testsFiles/A.txt est introuvable!");
        }
        catch(err)
        {
            console.error(err);
        }
    });
    
    
    it('should return 404 when user forgets to provide file path ', async () => {
        
        const res = await request(app).delete('/')
        .set('Authorization', 'testuser accountToken')
        .send({filePath:undefined,parentPath:"Data/testsFiles"});
        
        expect(res.statusCode).toBe(404);
        try
        {
            const respObj = JSON.parse(res.text);; 
            expect(respObj.message).toBe("Vous devez envoyer un chemin valide!");
        }catch(err)
        {
            console.error(err);
        }
    });

    describe("Add file before fileExists case",()=>{
        
      
        it('should return 200 when user provides filePath and that the fileExists ', async () => {
            
            if(!fs.existsSync("Data/testsFiles"))
                fs.mkdirSync("Data/testsFiles", { recursive: true });
        
            if(!fs.existsSync("Data/testsFiles/A.txt"))
            {
                fs.writeFileSync("Data/testsFiles/A.txt","");
            }
        
            const res = await request(app).delete('/')
            .set('Authorization', 'testuser accountToken')
            .send({filePath:"Data/testsFiles/A.txt",parentPath:"Data/testsFiles"});

            expect(res.statusCode).toBe(200);
            try
            {
                const respObj = JSON.parse(res.text); 
                expect(respObj.message).toBe("Data/testsFiles/A.txt a été enlevé!");
                expect(fs.existsSync("Data/testsFiles/A.txt")).toBe(false);
            }
            catch(err)
            {
                console.error(err);
            }
        });
    });
})