import React, { useState } from "https://cdn.skypack.dev/react";
import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import OperatorPage from "./pages/OperatorPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import authService from "./services/authService.js";

export default function App() {
  const [user, setUser] = useState(null); // {username, role}

  const handleLogin = async (username, password) => {
    const result = await authService.login(username, password);
    if (result) {
      setUser({ username, role: result.role });
    } else {
      alert("Login failed");
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <div className="flex h-screen">
      {user && <Sidebar role={user.role} onLogout={handleLogout} />}
      <div className="flex-1 flex flex-col">
        <Navbar user={user} />
        <div className="p-4 flex-1 overflow-auto">
          {!user && <LoginPage onLogin={handleLogin} />}
          {user?.role === "admin" && <AdminPage />}
          {user?.role === "operator" && <OperatorPage />}
        </div>
      </div>
    </div>
  );
}
