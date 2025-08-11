
const router = require('../authentification');
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = router;

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('POST /login', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.locals.users = [
      { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
      { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
    ];
    app.locals.sessions = [];
    /*app.locals.sessions = [
        {
          username: 'testuser',
          password: 'pass123',
          currentToken: 'mockedToken',
          previousToken: null,
          type: 'secret',
          room: 'A1',
          commands: []
        }
    ];*/
    app.locals.intervals = [];
    app.locals.secretKey = 'testsecret';
    app.use(authRoutes);
  });

  it('should return 400 for invalid username', async () => {
    const res = await request(app).post('/login').send({
      username: 'wronguser',
      password: 'pass123'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid username');
  });

  it('should return 400 for invalid password', async () => {
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/login').send({
      username: 'testuser',
      password: 'wrongpass'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid password');
  });

  it('should return 200 and token for valid login', async () => {
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mockedToken');

    const res = await request(app).post('/login').send({
      username: 'testuser',
      password: 'pass123',
      previousToken: null
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBe('mockedToken');
    expect(res.body.room).toBe('A1');
    expect(res.body.type).toBe('secret');
  });

  it('should create a new session for a different user and replace the old session so that length is 2 items', async () => {
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mockedToken');
    
    const res = await request(app).post('/login').send({
      username: 'testuser2',
      password: 'pass1232',
      previousToken: null
    });
    setTimeout(async () => {
       var data = {
        username: 'testuser',
        password: 'pass1232',
        previousToken: null
       };
       const res2= await request(app).post('/login').send(data);
        
        console.log(app.locals.sessions);
        expect(app.locals.sessions.length).toEqual(2);
    },600000);
   
    
  });
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.locals.users = [
      { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
      { username: 'testuser2', password: 'hashedpass2', accountType: 'admin', room: 'A1' }
    ];
    app.locals.sessions = [{ username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' }];
      /*app.locals.sessions = [
        {
          username: 'testuser',
          password: 'pass123',
          currentToken: 'mockedToken',
          previousToken: null,
          type: 'secret',
          room: 'A1',
          commands: []
        }
    ];*/
    app.locals.intervals = [];
    app.locals.secretKey = 'testsecret';
    app.use(authRoutes);
  });
  it('testing put method in authentification.js', async () => {
    const res = await request(app).put('/signup').send({
      oldUser: { username: 'testuser', password: 'hashedpass', accountType: 'admin', room: 'A1' },
      newUser: { username: 'newtestuser', password: 'newhashedpass', accountType: 'admin', room: 'A1' },
    });
    console.log(app.locals.users[0]);
      expect(app.locals.users[0]).toEqual({
        username: 'newtestuser',
        password: 'hashedpass',
        accountType: 'admin',
        room: 'A1',
        email: undefined,
        role: undefined,
        imgSource: undefined
      });
      expect(app.locals.users.length).toBe(1);
      
  });
});