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
        app.use(authRoutes);
    });

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