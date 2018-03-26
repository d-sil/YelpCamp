var express    = require("express");
var router     = express.Router({mergeParams: true});  // the '{mergeParams: true}' will merge the params from the campgrounds and comments together so that we are able to find the 'id' in the database when needed (when we are associating comments with campgrounds)
var Campground = require("../models/campground");
var Comment    = require("../models/comment");
var middleware = require("../middleware");  // if our file is named 'index.js' the directory will automatically use it by default thus we don't need to list it here ('middleware/index.js)'.

// Comments New
router.get("/new", middleware.isLoggedIn, function(req, res) {
    // find campground by id
    Campground.findById(req.params.id, function(err, campground) {
       if(err) {
           console.log(err);
           req.flash("error", "Something went wrong!");
           res.redirect("/");
       } else {
            res.render("comments/new", {campground: campground});     
       }
    });
});

// Comments Create
router.post("/", middleware.isLoggedIn, function(req, res) {
   // lookup campground using ID
   Campground.findById(req.params.id, function(err, campground) {
      if(err) {
          console.log(err);
          req.flash("error", "Something went wrong!");
          res.redirect("/");
      } else {
          // create new comment
          Comment.create(req.body.comment, function(err, comment) {
              if(err) {
                  console.log(err);
              } else {
                  // add username and ID to comment
                  comment.author.id = req.user._id;
                  comment.author.username = req.user.username;
                  // save comment
                  comment.save();
                  // connect new comment to campground and then save
                  campground.comments.push(comment._id);
                  campground.save();
                  // redirect to campground show page
                  res.redirect("/campgrounds/" + campground._id);
              }
          });
      }
   });
});

// COMMENT EDIT ROUTE
router.get("/:commentId/edit", middleware.checkUserComment, function(req, res) {  // we have to use 'commentId' (or something similar), because we are already using 'id' before it ('campgrounds/:id') in the query string
   Campground.findById(req.params.id, function(err, foundCampground) {
      if(err || !foundCampground) {
          req.flash("error", "No campground found");
          return res.redirect("back");
      } 
      Comment.findById(req.params.commentId, function(err, foundComment) {
           if(err) {
               req.flash("error", "Something went wrong!");
               res.redirect("/");
           } else {
               res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});  // the 'req.params.id' refers to the first id in the query string (campgrounds/:id)
           }
      });
   });
});

// COMMENT UPDATE
router.put("/:commentId", middleware.checkUserComment, function(req, res) {
    Comment.findByIdAndUpdate(req.params.commentId, req.body.comment, function(err, updatedComment) {  // 'FindByIdAndUpdate' takes three arguments. 1. the id to find the data  2. the data to update  3. the callback fn
       if(err) {
           req.flash("error", "Something went wrong!");
           res.redirect("/");
       } else {
           req.flash("success", "Comment updated!");
           res.redirect("/campgrounds/" + req.params.id);  // referring to '/campgrounds/:id'
       }
    });
});

// COMMENT DESTROY ROUTE
router.delete("/:commentId", middleware.isLoggedIn, middleware.checkUserComment, function(req, res){
   // find campground, remove comment from comments array, delete comment in db
   Campground.findByIdAndUpdate(req.params.id, {
     $pull: {
       comments: req.comment.id
     }
   }, function(err) {
     if(err){ 
         console.log(err)
         req.flash('error', err.message);
         res.redirect('/');
     } else {
         req.comment.remove(function(err) {
           if(err) {
             req.flash('error', err.message);
             return res.redirect('/');
           }
           req.flash('error', 'Comment deleted!');
           res.redirect("/campgrounds/" + req.params.id);
         });
     }
   });
  });

module.exports = router;