const router = require('../authentification');
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = router;
const multer = require('multer');

jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock("node-fetch");
/*
    jest.mock('multer', () => {
        return jest.fn(() => ({   
        single: jest.fn(),
        array: jest.fn(),
        fields: jest.fn(),
        any: jest.fn(),
        none: jest.fn(),
        diskStorage: jest.fn(),
        memoryStorage: jest.fn(),
  }));

});*/

// describe('DELETE /authentification',()=>{
//     let app;
//     beforeEach(()=>{
       
//         app = express();
//         app.use(express.json());
//         app.locals.users = [
//         { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
//         { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
//         ];
//         app.locals.sessions = [{ username: 'testuser', password: 'hashedpass',currentToken: 'accountToken',accountType: 'admin', room: 'A1' },
//         ];
//         app.locals.intervals = [];
//         app.locals.roomDic = {'A1':['A1']};
//         app.use(authRoutes);
//     });
//     test('should return 200 and token for valid deletion',async ()=>{
//         jwt.verify.mockReturnValue(app.locals.users[0]);
//         const b = {username:"testuser",room:"A1"};
//         const res = await request(app).delete('/signup')
//         .set('Authorization', 'testuser accountToken')
//         .set('Content-Type', 'application/json')
//         .send(b);
//         expect(res.statusCode).toBe(200);
//     });
// });

describe ('POST /QRauthentification ', () => {
    let app;
    beforeEach(()=>{    
        app = express();
        app.use(express.json());
        app.locals = {};
        app.locals.secretKey = 'hashedSecret';
        app.locals.users = [   
            { username: 'testuser1', password: "secret1", accountType: 'admin', room: 'A1' },
            { username: 'testuser2', password: "secret2", accountType: 'admin', room: 'A2' }
        ];

        app.locals.sessions = [{username:"testuser1",password:"mockedHash-secret1",room:"A1",currentToken:undefined
            ,oldToken:"mockedToken-testuser1",commands:[1]},
        {username:"testuser2",password:"mockedHash-secret2",room:"A2",currentToken:"mockedToken-testuser2"
            ,oldToken:undefined,commands:[]}];
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
            callback(null, token == "mockedToken-testuser1"?{username:"testuser1",password:"mockedHash-secret1",room:"A1",currentToken:undefined
            ,oldToken:"mockedToken-testuser1",commands:[1]}: token == "mockedToken-testuser2" ? 
            {username:"testuser2",password:"mockedHash-secret2",room:"A2",currentToken:"mockedToken-testuser2"
            ,oldToken:undefined,commands:[2]}:undefined); // simulate successful verification
        });
        jwt.sign.mockImplementation((payload, secret, options)=>{
            return "mockedToken-"+payload.username;
        });
    });

    // it('should return 200 and qrHTMl for valid loginQRStepOne', async () => {
    //     console.log(app.locals.users);
    //     const res = await request(app).post('/loginQRStepOne').send({username:"testuser",password:"secret2"});
    //     console.log(res.text);
    //     expect(res.statusCode).toBe(200);
    //     expect(res.header['content-type']).toBeDefined();
    //     expect(res.header['content-type'].indexOf("text/html")).not.toBe(-1);
    // });
    it("Testing relogin - It should return 200 and session must contain new token with oldCommands.", async () => {
        const res = await request(app)
            .post('/login')
            .send({
            username: "testuser1",
            password: "secret1",
            previousToken: "mockedToken-testuser1"
            });

            // Check content-type properly
            expect(res.headers['content-type']).toMatch(/application\/json/);

            // Log response body if needed
            console.log(res.body);

            // Assertions
            expect(res.statusCode).toBe(200);
            expect(app.locals.sessions[app.locals.sessions.length - 1].username).toBe("testuser1");
            expect(app.locals.sessions[app.locals.sessions.length - 1].currentToken).toBe("mockedToken-testuser1");
            expect(app.locals.sessions[app.locals.sessions.length - 1].commands.length).toBeGreaterThan(0);
            console.log(app.locals.sessions[app.locals.sessions.length - 1]);
        });
});
// describe('PUT /authentification', () => {
//     let app;
//     beforeEach(()=>{
       
//         app = express();
//         app.use(express.json());
//         app.locals.users = [
//         { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
//         { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
//         ];
//         app.locals.sessions = [{ username: 'testuser', password: 'hashedpass',currentToken: 'accountToken',accountType: 'admin', room: 'A1' },
//         ];
//         app.locals.intervals = [];
//         app.use(authRoutes);
//     });
    
//     it('should return 200 and token for valid login', async () => {
//         bcrypt.compare.mockResolvedValue(true);
//         jwt.sign.mockReturnValue('mockedToken');
//         console.log(app.locals.users);

//         var a = {
//             oldUser: { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
//             newUser: { username: 'testuser', password: 'newhashedpass', accountType: 'admin', room: 'A1',email:"email" }
//         ,imgSource:undefined};
//         var b = Object.keys(a).reduce((start,curr)=>
//              {start.append(curr,a[curr]); return start; },new FormData())
//         const res = await request(app).put('/signup')
//         .set('Authorization', 'testuser accountToken')
//         .send(b);
//         console.log(res);
//         expect(res.statusCode).toBe(200);
//     });
    
//     it('should return 200 and token for valid login', async () => {
//         bcrypt.compare.mockResolvedValue(true);
//         jwt.sign.mockReturnValue('mockedToken');
//         console.log(app.locals.users);
        
//         var a = {
//             oldUser: { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
//             newUser: { username: 'testuser', password: 'newhashedpass', accountType: 'admin', room: 'A1',email:"email" }
//         ,imgSource:new File([""],"test.jpg")};
//         var b = Object.keys(a).reduce((start,curr)=>
//              {start.append(curr,a[curr]); return start; },new FormData())
//         const res = await request(app).put('/signup')
//         .set('Authorization', 'testuser accountToken')
//         .send(b);
//         console.log(res);
//         expect(res.statusCode).toBe(200);
//         //expect(res.body.token).toBe('mockedToken');
//     });

// });
