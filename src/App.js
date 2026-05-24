// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Invoices from "./pages/Invoices";
import Quotations from "./pages/Quotations";
import Analytics from "./pages/Analytics";

import "./styles/global.css";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/clients"    element={<PrivateRoute><Clients /></PrivateRoute>} />
          <Route path="/invoices"   element={<PrivateRoute><Invoices /></PrivateRoute>} />
          <Route path="/quotations" element={<PrivateRoute><Quotations /></PrivateRoute>} />
          <Route path="/analytics"  element={<PrivateRoute><Analytics /></PrivateRoute>} />

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
