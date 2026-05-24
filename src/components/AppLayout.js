// src/components/AppLayout.js
import React from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children, title }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {title && (
          <div className="topbar">
            <span className="topbar-title">{title}</span>
          </div>
        )}
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}
