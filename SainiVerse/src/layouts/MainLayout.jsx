import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import GuestLoveWidget from '../components/GuestLoveWidget';
import StatusToast from '../components/StatusToast';
import Footer from '../components/Footer';
import FloatingHearts from '../components/FloatingHearts';
import ClickAnimation from '../components/ClickAnimation';
import WelcomeModal from '../components/WelcomeModal';
import SpecialOccasionModal from '../components/SpecialOccasionModal';
import UploadModal from '../components/UploadModal';
import LightboxModal from '../components/LightboxModal';
import { useVault } from '../context/VaultContext';
import { useAudio } from '../context/AudioContext';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isNavbarPlaying, toggleNavbarMusic, navbarTrack } = useAudio();
  const {
    user,
    memories,
    visitorRole,
    toggleRole,
    notification,
    isUploadOpen,
    setIsUploadOpen,
    selectedMemory,
    setSelectedMemory,
    handleUploadSuccess,
    handleDeleteMemory,
    showEntryPopup,
    setShowEntryPopup,
    handleDismissEntry,
    activeOccasion,
    closeOccasion,
  } = useVault();

  // Map route pathname to currentView for Navbar
  const currentView =
    location.pathname === '/gallery' || location.pathname === '/memories'
      ? 'grid'
      : location.pathname === '/timeline'
      ? 'timeline'
      : location.pathname === '/about'
      ? 'about'
      : location.pathname === '/private-vault'
      ? 'private-vault'
      : location.pathname === '/countdown' || location.pathname === '/coundown'
      ? 'countdown'
      : location.pathname === '/music'
      ? 'music'
      : 'home';

  const handleViewChange = (viewId) => {
    if (viewId === 'grid') navigate('/memories');
    else if (viewId === 'timeline') navigate('/timeline');
    else if (viewId === 'about') navigate('/about');
    else if (viewId === 'music') navigate('/music');
    else navigate('/');
  };

  const isModalActive = showEntryPopup || Boolean(activeOccasion);

  return (
    <div className="min-h-screen bg-[#FFF1F2] relative selection:bg-rose-300/40 selection:text-rose-900 flex flex-col">
      {/* Full-app Interactive Liquid Gooey Click Animation */}
      <ClickAnimation />

      {/* Floating Translucent Background Hearts */}
      <FloatingHearts />

      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenUpload={() => setIsUploadOpen(true)}
        currentUser={user}
        onLockVault={() => setShowEntryPopup(true)}
        visitorRole={visitorRole}
        onToggleRole={toggleRole}
        isModalActive={isModalActive}
        isPlaying={isNavbarPlaying}
        onToggleMusic={toggleNavbarMusic}
        navbarTrack={navbarTrack}
      />

      {/* Interactive Guest Love Widget */}
      <GuestLoveWidget visitorRole={visitorRole} />

      {/* Floating Status Notification */}
      <StatusToast message={notification} />

      {/* Main Routed Page Content */}
      <main className="flex-1 pt-16 sm:pt-20 md:pt-24 pb-16 relative z-10">
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Welcome Entry Modal */}
      <WelcomeModal
        isOpen={showEntryPopup}
        onDismiss={handleDismissEntry}
      />

      {/* Special Occasion Modal (Birthday / Anniversary) */}
      <SpecialOccasionModal
        isOpen={Boolean(activeOccasion)}
        occasion={activeOccasion}
        role={visitorRole}
        onContinue={closeOccasion}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        currentUser={user}
      />

      {/* Lightbox Modal */}
      <LightboxModal
        memory={selectedMemory}
        memories={memories}
        isOpen={Boolean(selectedMemory)}
        onClose={() => setSelectedMemory(null)}
        onNavigate={setSelectedMemory}
        onDelete={handleDeleteMemory}
      />
    </div>
  );
}
