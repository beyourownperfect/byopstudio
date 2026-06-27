import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Repository from "@/pages/Repository";
import Practice from "@/pages/Practice";
import Bookmarks from "@/pages/Bookmarks";
import Mistakes from "@/pages/Mistakes";
import Pulse from "@/pages/Pulse";
import Log from "@/pages/Log";
import Timeline from "@/pages/Timeline";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/pulse" replace />} />
            <Route path="/pulse" element={<Pulse />} />
            <Route path="/solve" element={<Navigate to="/solve/repository" replace />} />
            <Route path="/solve/repository" element={<Repository />} />
            <Route path="/solve/practice" element={<Practice />} />
            <Route path="/solve/bookmarks" element={<Bookmarks />} />
            <Route path="/solve/mistakes" element={<Mistakes />} />
            <Route path="/log" element={<Log />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="*" element={<Navigate to="/pulse" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
