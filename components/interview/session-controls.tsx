// Implements #6: Session controls — end session + mic mute
'use client';

import { useState } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface SessionControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndSession: () => void;
}

export function SessionControls({ isMuted, onToggleMute, onEndSession }: SessionControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          icon={isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          className={isMuted ? 'text-red-500' : ''}
        >
          {isMuted ? 'Muted' : 'Unmute'}
        </Button>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowConfirm(true)}
          aria-label="End interview session"
          icon={<PhoneOff className="w-4 h-4" />}
        >
          End Session
        </Button>
      </div>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="End Interview?"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setShowConfirm(false);
                onEndSession();
              }}
            >
              End Interview
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)] font-body">
          Are you sure you want to end this interview? The transcript will be saved and analysis
          will begin automatically.
        </p>
      </Modal>
    </>
  );
}
