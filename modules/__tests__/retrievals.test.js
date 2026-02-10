const retrievalsRouter = require("../retrievals");
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
        app.locals.occupations = ["A","B"];
        app.locals.intervals = [];
        app.locals.secretKey = 'testsecret';
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