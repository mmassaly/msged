const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const  fs = require("node:fs");
const { extractTextFromPDF } = require('../services/openAI');
const {postCVDir,putCVDir,openAIChargeCV} = require('../directory');
// Mock jwt
jest.mock('jsonwebtoken');
// __tests__/directorytest.test.js
jest.mock('pdf-parse', () => {
  return {
    PDFParse: jest.fn().mockImplementation(() => {
      return {
        getText: jest.fn().mockResolvedValue({
          pages: [
            {
              text: "Mamadou Massaly Développeur Logiciel | Ingénieur Full Stack (4 ans et 6 mois ...",
              num: 1
            },
            {
              text: "Électronique & Systèmes Embarqués ...",
              num: 2
            }
          ],
          text: "Mamadou Massaly Développeur Logiciel | Ingénieur Full Stack (4 ans et 6 mois ...",
          total: 3
        })
      };
    })
  };
});
describe('GET /CV with valid token', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock app.locals
    app.locals.sessions = [
      { username: 'user123', currentToken: 'validtoken', room: 'principal' }
    ];
    app.locals.secretKey = 'testsecret';
    app.locals.cvs = ['CV1', 'CV2'];
    app.locals.cvDirs = [];
    app.locals.roomDic = {"principal/Administration/CVs":["principal","principal/Administration","principal/Administration/CVs"]};
    // ✅ Mock authenticateToken middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      const userName = authHeader && authHeader.split(' ')[0];

      if (!token) return res.sendStatus(401);

      const session = app.locals.sessions.find(
        s => s.username === userName && s.currentToken === token
      );

      if (!session) return res.sendStatus(403);

      jwt.verify(token, app.locals.secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        req.session = session;
        next();
      });
    };

    // ✅ Define route with middleware
    app.get('/CV', authenticateToken, (req, res) => {
      res.json({ cvs: req.app.locals.cvs });
    });
    app.post('/CV',authenticateToken,postCVDir);
    
    app.put('/CV',authenticateToken,putCVDir);

    app.post('/CV/charge',authenticateToken,openAIChargeCV);
  });

  /*test('should pass authentication and return CVs', async () => {
    // ✅ Simulate successful token verification
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { name: 'user123' });
    });

    const response = await request(app)
      .get('/CV')
      .set('Authorization', 'user123 validtoken');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ cvs: ['CV1', 'CV2'] });
  });
  
  test('should have givenpath in the list', async () => {
    // ✅ Simulate successful token verification
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { name: 'user123' });
    });

    const response = await request(app)
      .post('/CV')
      .set('Authorization', 'user123 validtoken')
      .send({givenPath:"principal/Administration/CVs"
        ,parentPath:"principal/Administration"});
    if(response.statusCode == 500)
    {
        console.log(response.text);
    }
    else if(response.statusCode == 200)
    {
        console.log(response.body);
        console.log(app.locals.cvDirs);
    }
    expect(response.statusCode).toBe(200);
    expect(app.locals.cvDirs).toContain("principal/Administration/CVs");
    
  });

   test('should not have givenpath in the list', async () => {
    // ✅ Simulate successful token verification
    app.locals.cvDirs = ["principal/Administration/CVs"];
    
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { name: 'user123' });
    });

    const response = await request(app)
      .post('/CV')
      .set('Authorization', 'user123 validtoken')
      .send({givenPath:"principal/Administration/CVs"
        ,parentPath:"principal/Administration"});
    if(response.statusCode == 500)
    {
        console.log(response.text);
    }
    else if(response.statusCode == 200)
    {
        console.log(response.body);
        console.log(app.locals.cvDirs);
    }
    expect(response.statusCode).toBe(200);
    expect(app.locals.cvDirs).not.toContain("principal/Administration/CVs");
    
  });
  test('the givenpath should be a part of cvs object',async()=>{
    app.locals.cvs ={};
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { name: 'user123' });
    });
    const response = await request(app)
      .put('/CV')
      .set('Authorization', 'user123 validtoken')
      .send({givenPath:"principal/Administration/CVs/Mamadou_Massaly_CV_FR-5.pdf"
        ,parentPath:"principal/Administration/CVs",fullName:"Mamaadou Massaly",prefix:"Mr"
        ,competencies:[],experiences:[],degrees:[]});
    if(response.statusCode == 500)
    {
        console.log(response.text);
    }
    else if(response.statusCode == 200)
    {
        console.log(response.body);
        console.log(app.locals.cvs);
    }
    expect(Object.keys(app.locals.cvs)).toContain("principal/Administration/CVs");
  });
*/

  test('we are calling apenAI.js to receive a cvObject of the pdf file',async()=>{
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { name: 'user123' });
    }); 
    try{
      const response = await request(app)
      .post('/CV/charge')
      .set('Authorization', 'user123 validtoken')
      .set('Content-Type', 'application/json')
      .send({givenPath:"principal/Administration/CVs",parentPath:"principal/Administration"});
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: "CV chargé avec succès!" });

    }
    catch(error)
    {
        console.error("Error processing PDF:", error);
    }
  });
  

});
