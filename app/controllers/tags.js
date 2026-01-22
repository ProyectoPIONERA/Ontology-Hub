/**
 * Module dependencies.
 */

var mongoose = require("mongoose"),
  //, Article = mongoose.model('Article')
  Tag = mongoose.model("Stattag"),
  Vocabulary = mongoose.model("Vocabulary");

var app_name;
var app_name_shorcut;

exports.configureName = function (an, ans) {
  app_name = an;
  app_name_shorcut = ans;
};

/**
 * List items tagged with a tag
 */

exports.index = function (req, res) {
  Tag.list(function (err, tags) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    res.render("tags/index", {
      tags: tags,
      app_name_shorcut: app_name_shorcut,
      app_name: app_name,
    });
  });
};

exports.new = function (req, res) {
  res.render("tags/new", {
    tag: new Tag({}),
    redirect: req.header("Referer"),
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

exports.load = function (req, res, next, id) {
  Tag.load(id, function (err, tag) {
    if (err) return next(err);
    if (!tag) return next(new Error("Tag " + id + " not found"));
    req.tagObj = tag;
    next();
  });
};

/**
 * Edit a tag
 */

exports.edit = function (req, res) {
  res.render("tags/edit", {
    tag: req.tagObj,
    redirect: "/edition/tags",
    app_name_shorcut: app_name_shorcut,
    app_name: app_name,
  });
};

/**
 * Delete a tag
 */
exports.destroy = function (req, res) {
  var tag = req.tagObj;
  Tag.delete(tag, function (err) {
    if (err) {
      req.flash("error", "Tag not removed " + err);
      res.redirect("/edition/tags");
    } else {
      req.flash("info", "Tag deleted successfully");
      // Delete the label of the tag in the vocabularies
      Vocabulary.deleteTagVocab(tag.label, function (err) {
        if (err) {
          req.flash(
            "error",
            "Error deleting the tag in the vocabularies " + err
          );
          res.redirect("/edition/tags");
        } else {
          return res.redirect("/edition/tags");
        }
      });
    }
  });
};

/**
 * Update tag
 */

exports.update = function (req, res) {
  var tag = req.tagObj;
  Tag.findLabel(req.body.label, function (err, label) {
    if (err)
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    if (label) {
      //tag already exist
      req.flash("error", "This tag already exists");
      res.redirect("/edition/tags/" + tag.id);
    } else {
      var label = tag.label;
      tag.label = req.body.label;
      // Update the label of the tag in stattags
      tag
        .save()
        .then(() => {
          // Update the label of the tag in the vocabularies
          Vocabulary.updateTagVocab(label, req.body.label, function (err) {
            if (err) {
              req.flash(
                "error",
                "Error updating the tag in the vocabularies " + err
              );
              res.redirect("/edition/tags");
            } else {
              req.flash("info", "Tag updated successfully");
              return res.redirect("/edition/tags");
            }
          });
        })
        .catch((err) => {
          res.render("tags/edit", {
            tag: tag,
            errors: err.errors,
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        });
    }
  });
};

/**
 * Create tag
 */
exports.create = function (req, res) {
  //Detect if AJAX or JSON
  const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf("application/json") !== -1);

  const label = (req.body.label || "").trim();
  if(!label){
    if(wantsJson) return res.status(400).json({error: "Tag label is required"});
    req.flash("error", "Tag label is required");
    return res.redirect("/edition/tags/new");
  }

  //Check if the tag already exists
  Tag.findLabel(label, function (err, existing) {
    if (err){
      if (wantsJson) return res.status(500).json({error: "Database error"});
      return res.render("500", {
        app_name_shorcut: app_name_shorcut,
        app_name: app_name,
      });
    }

    if (existing) {
      //tag already exist
      if(wantsJson) return res.status(409).json({error: "This tag already exists"});
      req.flash("error", "This tag already exists");
      return res.redirect("/edition/tags/new");
    } 

    var tag = new Tag({label: label});

    tag
      .save()
      .then((saved) => {
        if(wantsJson){
          return res.status(201).json({
            _id: saved._id,
            label: saved.label,
          });
        }
          req.flash("success", "Tag created successfully");
          return res.redirect(req.session.backURL || "/edition/");
        })
        .catch((err) => {
          console.error("[tags.create error]", err);
          if(wantsJson) return res.status(500).json({error: "Error saving tag"});

          return res.render("500", {
            app_name_shorcut: app_name_shorcut,
            app_name: app_name,
          });
        });
  });
};
