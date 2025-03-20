const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const TEST_SERVER_BASE_URL = 'http://20.244.56.144/test';

// Cache to minimize API calls to the test server
const cache = {
  users: null,
  userPosts: {},
  postComments: {},
  cachedPopularPosts: null,
  cachedLatestPosts: null,
  lastUpdated: {
    users: 0,
    userPosts: {},
    popularPosts: 0,
    latestPosts: 0
  }
};

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL = 30000;

app.use(cors());
app.use(express.json());

// Helper function to check if cache is valid
const isCacheValid = (key) => {
  const now = Date.now();
  return cache.lastUpdated[key] && (now - cache.lastUpdated[key] < CACHE_TTL);
};

// Fetch all users from the test server
async function fetchAllUsers() {
  if (isCacheValid('users')) {
    return cache.users;
  }

  try {
    const response = await axios.get(`${TEST_SERVER_BASE_URL}/users`);
    cache.users = response.data.users;
    cache.lastUpdated.users = Date.now();
    return cache.users;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Fetch posts for a specific user
async function fetchUserPosts(userId) {
  if (cache.userPosts[userId] && isCacheValid(`userPosts_${userId}`)) {
    return cache.userPosts[userId];
  }

  try {
    const response = await axios.get(`${TEST_SERVER_BASE_URL}/users/${userId}/posts`);
    cache.userPosts[userId] = response.data.posts;
    cache.lastUpdated.userPosts[userId] = Date.now();
    return cache.userPosts[userId];
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    throw error;
  }
}

// Fetch comments for a specific post
async function fetchPostComments(postId) {
  if (cache.postComments[postId]) {
    return cache.postComments[postId];
  }

  try {
    const response = await axios.get(`${TEST_SERVER_BASE_URL}/posts/${postId}/comments`);
    cache.postComments[postId] = response.data.comments;
    return cache.postComments[postId];
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error);
    throw error;
  }
}

// Get top 5 users with most posts
async function getTopUsers() {
  const users = await fetchAllUsers();
  const userIds = Object.keys(users);
  
  const userPostCounts = [];
  
  // Get post counts for each user
  for (const userId of userIds) {
    const posts = await fetchUserPosts(userId);
    userPostCounts.push({
      id: userId,
      name: users[userId],
      postCount: posts ? posts.length : 0
    });
  }
  
  // Sort by post count and get top 5
  return userPostCounts
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5);
}

// Get posts with highest comment count (popular posts)
async function getPopularPosts() {
  if (isCacheValid('popularPosts') && cache.cachedPopularPosts) {
    return cache.cachedPopularPosts;
  }

  const users = await fetchAllUsers();
  const userIds = Object.keys(users);
  
  let allPosts = [];
  
  // Get all posts from all users
  for (const userId of userIds) {
    const userPosts = await fetchUserPosts(userId);
    if (userPosts) {
      allPosts = allPosts.concat(userPosts.map(post => ({
        ...post,
        userName: users[post.userid]
      })));
    }
  }
  
  // Get comment counts for each post
  const postsWithCommentCounts = await Promise.all(
    allPosts.map(async (post) => {
      const comments = await fetchPostComments(post.id);
      return {
        ...post,
        commentCount: comments ? comments.length : 0
      };
    })
  );
  
  // Sort by comment count
  postsWithCommentCounts.sort((a, b) => b.commentCount - a.commentCount);
  
  // Find max comment count
  const maxCommentCount = postsWithCommentCounts.length > 0 ? postsWithCommentCounts[0].commentCount : 0;
  
  // Get all posts with the max comment count
  const popularPosts = postsWithCommentCounts.filter(post => post.commentCount === maxCommentCount);
  
  cache.cachedPopularPosts = popularPosts;
  cache.lastUpdated.popularPosts = Date.now();
  
  return popularPosts;
}

// Get latest 5 posts
async function getLatestPosts() {
  if (isCacheValid('latestPosts') && cache.cachedLatestPosts) {
    return cache.cachedLatestPosts;
  }

  const users = await fetchAllUsers();
  const userIds = Object.keys(users);
  
  let allPosts = [];
  
  // Get all posts from all users
  for (const userId of userIds) {
    const userPosts = await fetchUserPosts(userId);
    if (userPosts) {
      allPosts = allPosts.concat(userPosts.map(post => ({
        ...post,
        userName: users[post.userid]
      })));
    }
  }
  
  // Sort posts by ID (higher IDs are assumed to be newer)
  allPosts.sort((a, b) => b.id - a.id);
  
  // Get latest 5 posts
  const latestPosts = allPosts.slice(0, 5);
  
  // Add comment counts to each post
  const latestPostsWithComments = await Promise.all(
    latestPosts.map(async (post) => {
      const comments = await fetchPostComments(post.id);
      return {
        ...post,
        commentCount: comments ? comments.length : 0
      };
    })
  );
  
  cache.cachedLatestPosts = latestPostsWithComments;
  cache.lastUpdated.latestPosts = Date.now();
  
  return latestPostsWithComments;
}

// API endpoint for top users
app.get('/users', async (req, res) => {
  try {
    const topUsers = await getTopUsers();
    res.json({ users: topUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch top users' });
  }
});

// API endpoint for posts (popular or latest)
app.get('/posts', async (req, res) => {
  try {
    const type = req.query.type || 'latest';
    
    if (type === 'popular') {
      const popularPosts = await getPopularPosts();
      res.json({ posts: popularPosts });
    } else if (type === 'latest') {
      const latestPosts = await getLatestPosts();
      res.json({ posts: latestPosts });
    } else {
      res.status(400).json({ error: 'Invalid type parameter. Use "popular" or "latest".' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});