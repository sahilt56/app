// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import App from './App.jsx'
// import './index.css'// <-- YEH LINE HONI CHAHIYE

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// )
// src/main.jsx (ya src/index.js)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ResetPassword from './ResetPassword'; // Naye component ko import karein
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
  	<BrowserRouter>
  	  <Routes>
  		<Route path="/" element={<App />} />
  		<Route path="/reset-password" element={<ResetPassword />} />
  	  </Routes>
  	</BrowserRouter>
  </React.StrictMode>
);