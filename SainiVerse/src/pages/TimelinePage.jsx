import React from 'react';
import { useNavigate } from 'react-router-dom';
import TimelineView from '../components/TimelineView';
import ReturnHomeButton from '../components/ReturnHomeButton';
import { useVault } from '../context/VaultContext';

export default function TimelinePage() {
  const navigate = useNavigate();
  const { memories, setSelectedMemory, setIsUploadOpen, visitorRole } = useVault();

  return (
    <div className="space-y-4">
      <ReturnHomeButton onReturn={() => navigate('/')} />
      <TimelineView
        memories={memories}
        onSelectMemory={setSelectedMemory}
        onOpenUpload={() => setIsUploadOpen(true)}
        visitorRole={visitorRole}
      />
    </div>
  );
}
