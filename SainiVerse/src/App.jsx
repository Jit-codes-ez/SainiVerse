import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AudioProvider } from './context/AudioContext';
import { VaultProvider } from './context/VaultContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Memories from './pages/Memories';
import TimelinePage from './pages/TimelinePage';
import About from './pages/About';
import PrivateVault from './pages/PrivateVault';
import Coundown from './pages/Coundown';
import MusicPage from './pages/MusicPage';
import ScrollToUp from './components/ScrollToUp';

export default function App() {
  return (
    <AudioProvider>
      <VaultProvider>
        <BrowserRouter>
          <ScrollToUp />
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/memories" element={<Memories />} />
              <Route path="/gallery" element={<Memories />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/countdown" element={<Coundown />} />
              <Route path="/coundown" element={<Coundown />} />
              <Route path="/about" element={<About />} />
              <Route path="/private-vault" element={<PrivateVault />} />
              <Route path="/music" element={<MusicPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VaultProvider>
    </AudioProvider>
  );
}
