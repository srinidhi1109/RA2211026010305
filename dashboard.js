// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { fetchTopUsers, fetchPopularPosts, fetchLatestPosts } from '../api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    avgComments: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from all endpoints
        const [usersData, popularPostsData, latestPostsData] = await Promise.all([
          fetchTopUsers(),
          fetchPopularPosts(),
          fetchLatestPosts()
        ]);
        
        // Calculate stats
        const allPosts = [...popularPostsData.posts, ...latestPostsData.posts];
        const uniquePosts = [...new Map(allPosts.map(post => [post.id, post])).values()];
        const uniqueUserIds = [...new Set(uniquePosts.map(post => post.userid))];
        
        // Calculate average comments
        const totalComments = uniquePosts.reduce((sum, post) => sum + post.commentCount, 0);
        const avgComments = uniquePosts.length > 0 ? (totalComments / uniquePosts.length).toFixed(1) : 0;
        
        setStats({
          totalUsers: usersData.users.length,
          totalPosts: uniquePosts.length,
          avgComments: avgComments,
          activeUsers: uniqueUserIds.length
        });
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-6">Loading dashboard stats...</div>;
  }

  if (error) {
    return <div className="text-center py-6 text-red-600">Error loading dashboard: {error}</div>;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <h3 className="text-lg text-gray-600 mb-2">Total Users</h3>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span className="text-3xl font-bold">{stats.totalUsers}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <h3 className="text-lg text-gray-600 mb-2">Total Posts</h3>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
            <span className="text-3xl font-bold">{stats.totalPosts}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <h3 className="text-lg text-gray-600 mb-2">Avg. Comments</h3>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-1.02l-4.387 1.46.878-4.383A6.953 6.953 0 011 10c0-3.866 3.582-7 8-7s9 3.134 9 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span className="text-3xl font-bold">{stats.avgComments}</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <h3 className="text-lg text-gray-600 mb-2">Active Users</h3>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span className="text-3xl font-bold">{stats.activeUsers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;