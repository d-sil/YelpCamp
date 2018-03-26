var express        = require("express"),
    app            = express(),
    bodyParser     = require("body-parser"),
    mongoose       = require("mongoose"),
    flash          = require("connect-flash"),
    passport       = require("passport"),
    LocalStrategy  = require("passport-local"),
    methodOverride = require("method-override"),  // this will allow us to alter our POST routes (to 'put' 'delete' etc) by using '_method' on our forms
    User           = require("./models/user");
    //seedDB         = require("./seeds");

// requiring routes    
var indexRoutes      = require("./routes/index"),
    commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds");

var url = process.env.DATABASEURL || "mongodb://localhost"    
mongoose.connect(process.env.DATABASEURL);  // we exported the 'DATABASEURL' locally here on c9, and also on heroku with our different db from 'mLab'

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = require("moment");
//seedDB();  // seeding the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "this is top secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {  // we are creating our own middleware here. this function will be called on every route 
   res.locals.currentUser = req.user;  //  whatever we put inside 'res.locals' is going to be available in all of our templates. we are creating 'currentUser' and passing 'req.user' to it.  
   res.locals.error = req.flash("error");  // this will give us access to any flash message in all of our templates. 
   res.locals.success = req.flash("success");
   next();  // we must use 'next' here to move on to the next middleware, which will be the route handler in most cases. Since this is middleware, it will get hung up if we don't run 'next()' to continue on
});

// In the following 3 lines, we will be requiring route files in order to use the express router
app.use("/", indexRoutes);  // what is inside the "" will be added to every route in that file
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds", campgroundRoutes);

app.listen(process.env.PORT, process.env.IP, function() {
   console.log("The YelpCamp server has started!"); 
});