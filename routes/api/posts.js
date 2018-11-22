const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

//Post model
const Post = require('../../models/Post');

// Validation
const validatePostInput = require('../../validation/post');

// @route   GET api/posts/test
// @desc    Tests post route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'posts works' }));

// @route   GET api/posts
// @desc    Get posts
// @access  Public
router.get('/', (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ nopostsfound: 'No posts found' }));
});

// @route   GET api/posts/:id
// @desc    Get post by id
// @access  Public
router.get('/:id', (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err =>
      res.status(404).json({ nopostfound: 'No post found with that ID' })
    );
});

// @route   POST api/posts
// @desc    Create post
// @access  Private

router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errors object
      return res.status(400).json(errors);
    }
    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private

router.post(
  '/like/:postId',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { postId } = req.params;
    Post.findById(postId, (err, foundPost) => {
      if (!foundPost || err) {
        res.status(404).json({ Error: err, Message: 'Post not found' });
      }
      const index = foundPost.likes.findIndex(value => {
        return value.user == req.user.id;
      });
      if (index == -1) {
        foundPost.likes.push({ user: req.user.id });
      } else {
        foundPost.likes.splice(index, 1);
      }
      foundPost.save().then(savedPost => {
        res.status(200).json(savedPost);
      });
    });
  }
);

// @route   DELETE api/posts/:id
// @desc    Delete post
// @access  Private

router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const post = await Post.findOneAndRemove({
        _id: req.params.id,
        user: req.user.id
      });
    } catch (e) {
      e.status(404).json({ post: 'Unable to delete the post' });
    } finally {
      res.status(200).json({ post: 'post deleted' });
    }
  }
);

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private

router.post(
  '/comment/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errors object
      return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };

        // Add to comments array
        post.comments.unshift(newComment);

        // Save
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
  }
);

// @route   DELETE api/posts/comment/:id/:comment_id
// @desc    Like post
// @access  Private

router.delete(
  '/comment/:id/:comment_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id).then(post => {
      // Check to see if the comment exists & if user is authorized
      const commentIndex = post.comments.findIndex(
        comment =>
          comment.user.toString() === req.user.id &&
          comment._id.toString() === req.params.comment_id
      );
      if (commentIndex === -1) {
        return res
          .status(401)
          .json({ msg: 'You are not authorized to perform this action' });
      }

      post.comments.splice(commentIndex, 1);
      post.save().then(post => res.json({ msg: 'Comment Deleted' }));
    });
  }
);

module.exports = router;
