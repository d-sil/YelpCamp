var express    = require("express");
var router     = express.Router();  // 'router' is the conventional name used for the express router. when we make a separate file for the routes we use 'router.get' instead of 'app.get'
var Campground = require("../models/campground");
var middleware = require("../middleware");  // if our file is named 'index.js' the directory will automatically use it by default thus we don't need to list it here ('middleware/index.js)'. 
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
var geocoder = NodeGeocoder(options);
var Comment    = require("../models/comment");

// INDEX Route - show all campgrounds
router.get("/", function(req, res){
    var perPage = 8;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count({name: regex}).exec(function (err, count) {
                if (err) {
                    console.log(err);
                    res.redirect("back");
                } else {
                    if(allCampgrounds.length < 1) {
                        noMatch = "No campgrounds match that query, please try again.";
                    }
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: req.query.search
                    });
                }
            });
        });
    } else {
        // get all campgrounds from DB
        Campground.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function (err, allCampgrounds) {
            Campground.count().exec(function (err, count) {
                if (err) {
                    console.log(err);
                } else {
                    res.render("campgrounds/index", {
                        campgrounds: allCampgrounds,
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        noMatch: noMatch,
                        search: false,
                        page: 'campgrounds'
                    });
                }
            });
        });
    }
});

// CREATE Route - add new campground to DB
router.post("/", middleware.isLoggedIn, middleware.isSafe, function(req, res) {
  // Get all campgrounds from DB
  var name = req.body.name;
  var price = req.body.price;
  var image = req.body.image ? req.body.image : "https://images.unsplash.com/photo-1459909633680-206dc5c67abb?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&ixid=eyJhcHBfaWQiOjF9&s=0d1629bd64022b26db573150fe45c4f4";
  var desc = req.body.description;
  var author = {
      id: req.user._id,
      username: req.user.username
  };
  geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newCampground = {name: name, price: price, image: image, description: desc, author: author, location: location, lat: lat, lng: lng};
      // Create a new campground and add to DB
      Campground.create(newCampground, function(err, newlyCreated) {
          if(err) {
              console.log(err);
              req.flash("error", err.message);
              res.redirect("/");
          } else {
            //redirect back to campgrounds page
            res.redirect("/campgrounds");
          }
      });
  });
});

// NEW Route - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
   res.render("campgrounds/new"); 
});

// SHOW Route - shows more info about one campground 
router.get("/:id", function(req, res) {
    // find the campground with the provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground) {
       if(err || !foundCampground) {
           req.flash("error", "Campground not found");
           res.redirect("back");
       } else {
           console.log(foundCampground);
            // render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
       }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkUserCampground, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        if(err) {
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/");
        } else {
        res.render("campgrounds/edit", {campground: foundCampground});
        }   
        });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkUserCampground, middleware.isSafe, function(req, res) {
    geocoder.geocode(req.body.location, function (err, data) {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    var lat = data[0].latitude;
    var lng = data[0].longitude;
    var location = data[0].formattedAddress;
    var newData = {name: req.body.name, price: req.body.price, image: req.body.image, description: req.body.description, location: location, lat: lat, lng: lng};
       // find and update the correct campground
       Campground.findByIdAndUpdate(req.params.id, newData, function(err, updatedCampground) {
           if(err) {
               req.flash("error", err.message);
               res.redirect("/");
           } else {
               req.flash("success", "Campground updated!");
               // redirect somewhere(campground show page)
               res.redirect("/campgrounds/" + req.params.id);
           }
       });
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.isLoggedIn, middleware.checkUserCampground, function(req, res) {
    Comment.remove({
      _id: {
        $in: req.campground.comments
      }
    }, function(err) {
      if(err) {
          req.flash('error', err.message);
          res.redirect('/');
      } else {
          req.campground.remove(function(err) {
            if(err) {
                req.flash('error', err.message);
                return res.redirect('/');
            }
            req.flash('error', 'Campground deleted!');
            res.redirect('/campgrounds');
          });
      }
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;  // we are exporting the routes