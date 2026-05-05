require('./utils.js');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const mongoSanitize = require('express-mongo-sanitize');
const saltRounds = 12;

const app = express();
const PORT = process.env.PORT || 3000;
const expireTime = 1 * 60 * 60 * 1000; // 1 hour

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const { database } = include('databaseConnection');
const userCollection = database.db(mongodb_user_database).collection('users');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use((req, _res, next) => {
    Object.defineProperty(req, 'query', {
        ...Object.getOwnPropertyDescriptor(req, 'query'),
        value: req.query,
        writable: true,
    });
    next();
});
app.use(mongoSanitize({ replaceWith: '%' }));

const mongoStore = MongoStore.create({
    mongoUrl: `mongodb://admin:${mongodb_password}@ac-beq3xfz-shard-00-00.9rwfzad.mongodb.net:27017,ac-beq3xfz-shard-00-01.9rwfzad.mongodb.net:27017,ac-beq3xfz-shard-00-02.9rwfzad.mongodb.net:27017/?ssl=true&replicaSet=atlas-gbap5y-shard-0&authSource=admin&appName=Cluster0`,
    crypto: { secret: mongodb_session_secret }
});

app.use(session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
    cookie: { maxAge: expireTime }
}));

// HOME
app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        res.send(`
            <h1>Home</h1>
            <a href="/signup"><button>Sign Up</button></a><br><br>
            <a href="/login"><button>Log In</button></a>
        `);
    } else {
        res.send(`
            <h1>Hello, ${req.session.name}!</h1>
            <a href="/members"><button>Go to Members Area</button></a><br><br>
            <a href="/logout"><button>Sign Out</button></a>
        `);
    }
});

// SIGNUP
app.get('/signup', (req, res) => {
    res.send(`
        <h1>Create Account</h1>
        <form action='/signupSubmit' method='post'>
            <input name='name' type='text' placeholder='name'><br><br>
            <input name='email' type='email' placeholder='email'><br><br>
            <input name='password' type='password' placeholder='password'><br><br>
            <button>Submit</button>
        </form>
    `);
});

app.post('/signupSubmit', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name) { res.send(`Name is required. <a href='/signup'>Try again</a>`); return; }
    if (!email) { res.send(`Email is required. <a href='/signup'>Try again</a>`); return; }
    if (!password) { res.send(`Password is required. <a href='/signup'>Try again</a>`); return; }

    const schema = Joi.object({
        name: Joi.string().max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().max(20).required()
    });

    const validationResult = schema.validate({ name, email, password });
    if (validationResult.error != null) {
        res.send(`Invalid input. <a href='/signup'>Try again</a>`);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await userCollection.insertOne({ name, email, password: hashedPassword });

    req.session.authenticated = true;
    req.session.name = name;
    req.session.email = email;
    res.redirect('/members');
});

// LOGIN
app.get('/login', (req, res) => {
    res.send(`
        <h1>Log In</h1>
        <form action='/loginSubmit' method='post'>
            <input name='email' type='email' placeholder='email'><br><br>
            <input name='password' type='password' placeholder='password'><br><br>
            <button>Submit</button>
        </form>
    `);
});

app.post('/loginSubmit', async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().max(20).required()
    });

    const validationResult = schema.validate({ email, password });
    if (validationResult.error != null) {
        res.send(`Invalid input. <a href='/login'>Try again</a>`);
        return;
    }

    const result = await userCollection.find({ email }).project({ name: 1, email: 1, password: 1 }).toArray();

    if (result.length != 1) {
        res.send(`User not found. <a href='/login'>Try again</a>`);
        return;
    }

    if (await bcrypt.compare(password, result[0].password)) {
        req.session.authenticated = true;
        req.session.name = result[0].name;
        req.session.email = email;
        res.redirect('/members');
    } else {
        res.send(`Invalid email/password combination. <a href='/login'>Try again</a>`);
    }
});

// MEMBERS
app.get('/members', (req, res) => {
    if (!req.session.authenticated) {
        res.redirect('/');
        return;
    }

    const images = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    res.send(`
        <h1>Hello, ${req.session.name}!</h1>
        <img src='/${randomImage}' style='width:300px;'><br><br>
        <a href='/logout'><button>Sign Out</button></a>
    `);
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// STATIC FILES
app.use(express.static(__dirname + '/public'));

// 404
app.use((req, res) => {
    res.status(404).send('Page not found - 404');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});