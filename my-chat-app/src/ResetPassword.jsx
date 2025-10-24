// src/ResetPassword.jsx

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import chatService from './services/pocketbase';
import { User, Lock } from 'lucide-react';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
  	e.preventDefault();
  	if (!token) {
  	  setMessage('Error: No reset token found. Please request a new link.');
  	  return;
  	}
  	if (password !== passwordConfirm) {
  	  setMessage('Error: Passwords do not match.');
  	  return;
  	}
  	if (password.length < 8) {
  	  setMessage('Error: Password must be at least 8 characters long.');
  	  return;
  	}

  	setLoading(true);
  	setMessage('');

  	try {
  	  await chatService.confirmPasswordReset(token, password);
  	  setMessage('Password updated successfully! Redirecting to login...');
  	  setTimeout(() => {
  		navigate('/'); // Wapas login page par bhej dein
  	  }, 3000);
  	} catch (error) {
  	  setMessage('Error: Invalid or expired token. Please request a new link.');
  	  console.error(error);
  	} finally {
  	  setLoading(false);
  	}
  };

  return (
  	<div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-4">
  	  <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-8">
  		<div className="text-center mb-8">
  		  <div className="w-20 h-20 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
  			<Lock size={40} className="text-white" />
  		  </div>
  		  <h1 className="text-3xl font-bold text-gray-800">ChatApp</h1>
  		  <p className="text-gray-600 mt-2">Set Your New Password</p>
  		</div>

  		<form onSubmit={handleSubmit} className="space-y-4">
  		  <input
  			type="password"
  			placeholder="New Password (min. 8 characters)"
  			value={password}
  			onChange={(e) => setPassword(e.target.value)}
  			className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
  			disabled={loading}
  		  />
  		  <input
  			type="password"
  			placeholder="Confirm New Password"
  			value={passwordConfirm}
  			onChange={(e) => setPasswordConfirm(e.target.value)}
  			className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
  			disabled={loading}
  		  />
  		  <button
  			type="submit"
  			disabled={loading}
  			className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
  		  >
  			{loading ? 'Please wait...' : 'Update Password'}
  		  </button>
  		</form>
  		
  		{message && (
  			<p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
  			  {message}
  			</p>
  		)}
  	  </div>
  	</div>
  );
}

export default ResetPassword;