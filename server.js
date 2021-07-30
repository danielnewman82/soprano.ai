// Step 1- Create an expressjs server
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const userSchema = require('./models/userSchema');
const cookieParser = require('cookie-parser');
const postSchema = require('./models/postSchema');

const app = express();

const dotenv = require('dotenv').config();
const userURI = process.env.MONGODB_USER_URI;
const postURI = process.env.MONGODB_POST_URI
const JWTSecret = process.env.JWT_SECRET;

// Step 2- Connect mongodb atlas with this server
const postConn = mongoose.createConnection(process.env.MONGODB_POST_URI, 
  {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
// Step 8-Create Post model with image title and description
  const PostModel = postConn.model('Post', postSchema);
const userConn = mongoose.createConnection(process.env.MONGODB_USER_URI, 
  {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false});
// Step 3- Create a user model with name email password image
  const UserModel = userConn.model('User', userSchema);

// Bodyparser middleware
app.use( bodyParser.urlencoded({ extended: false }) );
app.use(bodyParser.json());
app.use(cookieParser());

// Step 15- Implement Authorization flow make apis private
// route protection middleware
const withAuth = function(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).send('Unauthorized: No token provided');
  } else {
    jwt.verify(token, JWTSecret, function(err, decoded) {
      if (err) {
        res.status(401).send('Unauthorized: Invalid token');
      } else {
        req.email = decoded.email;
        next();
      }
    });
  }
}

app.get('/checkToken', withAuth, function(req, res) {
    res.sendStatus(200);
  }
)

// Step 4- Create an api get the data (name email password , image) and save it using mongodb
app.post('/api/getUser', withAuth, function(req, res) {
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  const { email } = req.body;
  UserModel.findOneById(function (err, post) {
    if (err) return console.error(err);
    res.send(post);
  })
})

// POST route to register a user
app.post('/api/register', function(req, res) {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    const { email, password, name, image } = req.body
    UserModel.create({ email, password, name, image }, 
        function(err) {
      if (err) {
        res.status(500)
          .send("Error registering new user please try again.");
      } else {
        const payload = {email} ;
        const token = jwt.sign(payload, JWTSecret, {
          expiresIn: '1h'
        });
        res.cookie('token', token, { httpOnly: true })
          .status(200).send("Registration successful");
      }
    });
  });

// POST route to authenticate email and password
app.post('/api/authenticate', function(req, res) {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    const { email, password } = req.body;
    // Step 6- Validate the email is not already exist and not invalid
    UserModel.findOne({ email }, function(err, user) {
      if (err) {
        console.error(err);
        res.status(500)
          .json({
          error: 'Internal error please try again'
        });
      } else if (!user) {
        res.status(401)
          .json({
            error: 'Incorrect email'
          });
        console.log('Incorrect email')
      } else {
        // Step 7- Send the response with created user without password
        user.isCorrectPassword(password, function(err, same) {
          if (err) {
            res.status(500)
              .json({
                error: 'Internal error please try again'
            });
          } else if (!same) {
            res.status(401)
              .json({
                error: 'Incorrect password'
            });
            console.log('Incorrect password')
          } else {
            // Issue token
            const payload = { email };
            const token = jwt.sign(payload, JWTSecret, {
              expiresIn: '1h'
            });
            res.cookie('token', token, { httpOnly: true })
              .sendStatus(200);
            console.log('Authentication successful!')
          }
        });
      }
    });
  });
 
// Step 10- Get all post functionality
// Step 14- Only signed in user can see all post
app.get('/api/getPosts', withAuth, (req, res) => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    PostModel.find(function (err, posts) {
        if (err) return console.error(err);
        res.send(posts);
    });
    console.log('Sent array of post objects')
});

// Step 11-Get post by id functionality
app.get('/api/getPostsById', (req, res) => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    PostModel.findById(function (err, post) {
        if (err) return console.error(err);
        res.send(post);
    });
    console.log('Sent post object with the given id')
});

// Step 12- User can delete his own post
app.delete('/api/deletePostsById', (req, res) => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    PostModel.findByIdAndDelete(function (err, post) {
        if (err) return console.error(err);
        res.send(post);
    });
    console.log('Post deleted')
});

// Step 13- User can update his own post
app.put('/api/updatePostsById', (req, res) => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    PostModel.findByIdAndUpdate(function (err, post) {
        if (err) return console.error(err);
        res.send(post);
    });
    console.log('Post modified')
});

// Step 9-Create post functionality
app.post('/api/createPost', (req, res) => {
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    PostModel.create({ image: req.body.image, title: req.body.title, description: req.body.description });
    res.send(console.log('Post created in DB'))
});

app.use(express.static(path.join(__dirname,'/public')));

// Handles any requests that don't match the ones above
app.get('/', function (req, res, next) {
    res.sendFile(path.resolve('public/index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log('Express server is running on ' + port));
