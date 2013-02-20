var conf = require('config');
var express = require('express')
    , http = require('http') 
    , routes = require('routes') 
    , passport = require('passport')
    , path = require('path')
    , util = require('util')
    , TwitterStrategy = require('passport-twitter').Strategy
    , FacebookStrategy = require('passport-facebook').Strategy;
var ejs = require('ejs');
var app = express()
    , server = http.createServer(app)
    , io  = require('socket.io').listen(server);

var port = 3000;
server.listen(port);

app.configure(function(){
	app.set('view engine', 'ejs');
	app.set('view options', { layout: false });

	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('wanikun_secret'));
	app.use(express.session());
	//passportのinitializeとsessionを使います。
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

//passportのセッションを使うので
//リアライズ、デシリアライズのための関数を追記。
passport.serializeUser(function(user, done){
  done(null, user);
});
  
passport.deserializeUser(function(obj, done){
  done(null, obj);
});

app.get('/', function(req, res) {
    console.log('/');
    res.render('index', { locals: { port: port } });
});
app.get('/js/client.js', function (req, res) {
  res.sendfile(__dirname + '/static/js/client.js');
});

io.sockets.on('connection', function(socket) {
    socket.on('message', function(msg) {
        console.log('--------');
        console.log(util.inspect(passport.session.profile.provider));
        socket.emit('message', msg, passport.session.profile.provider, passport.session.profile.displayName);
        socket.broadcast.emit('message', msg, passport.session.profile.provider, passport.session.profile.displayName);
    });
    socket.on('disconnect', function() {
        console.log('disconnect');
    });
});

console.log('Server running at http://127.0.0.1:' + port + '/');

//ここからTwitter認証の記述
TWITTER_CONSUMER_KEY = conf.twitter.key
TWITTER_CONSUMER_SECRET = conf.twitter.secret
passport.use(new TwitterStrategy({
  consumerKey: TWITTER_CONSUMER_KEY,
  consumerSecret: TWITTER_CONSUMER_SECRET,
  callbackURL: "http://192.168.2.103:3000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    passport.session.accessToken = token;
    passport.session.profile = profile;
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

function twitterEnsureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
    res.redirect('/login/twitter');
};
 
app.get('/auth/twitter', passport.authenticate('twitter'));
 
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/login/twitter' }),
  function(req, res) {
    req.session.provider = passport.session.profile.provider;
    req.session.displayName = passport.session.profile.displayName;
    res.redirect('/');
  }
);
 
app.get('/logout/twitter', function(req, res){
  req.logout();
  res.redirect('/');
});
 
// Facebook
//ここからFacebook認証の記述
passport.use(new FacebookStrategy({
    clientID: conf.facebook.id,
    clientSecret: conf.facebook.secret,
    callbackURL: "http://192.168.2.103:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    passport.session.accessToken = accessToken;
    passport.session.profile = profile;
    process.nextTick(function () {
      done(null, profile);
    });
  }
));


function twitterEnsureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
    res.redirect('/login/facebok');
};
 
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login/facebook' }),
  function(req, res) {
    req.session.provider = passport.session.profile.provider;
    req.session.displayName = passport.session.profile.displayName;
    res.redirect('/');
  }
);

app.get('/logout/facebook', function(req, res){
  req.logout();
  res.redirect('/');
});
