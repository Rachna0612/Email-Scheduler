'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { api } from '@/lib/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function parseEmailsFromFile(content: string): string[] {
  const lines = content.split(/[\r\n,;]+/);
  const emails: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (emailRegex.test(trimmed)) {
      emails.push(trimmed.toLowerCase());
    }
  }
  return [...new Set(emails)];
}

export function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState(user?.email || '');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen && user) {
      setFromEmail(user.email);
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setStartTime(now.toISOString().slice(0, 16));
    } else if (!isOpen) {
      setSubject('');
      setBody('');
      setRecipients([]);
      setError('');
    }
  }, [isOpen, user]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const emails = parseEmailsFromFile(text);
      setRecipients((prev) => [...new Set([...prev, ...emails])]);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const addRecipient = () => {
    const trimmed = recipientInput.trim();
    if (trimmed && trimmed.includes('@')) {
      setRecipients((prev) => [...new Set([...prev, trimmed.toLowerCase()])]);
      setRecipientInput('');
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleSubmit = async () => {
    setError('');
    const effectiveStartTime = startTime || (() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      return now.toISOString().slice(0, 16);
    })();
    if (!subject || !body || !fromEmail || recipients.length === 0) {
      setError('Please fill all required fields and add at least one recipient.');
      return;
    }

    setLoading(true);
    try {
      await api.schedule({
        subject,
        body,
        fromEmail,
        recipients,
        startTime: new Date(effectiveStartTime).toISOString(),
        delayBetweenMs,
        hourlyLimit,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <Input
          label="From"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="sender@domain.com"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
              placeholder="recipient@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <Button variant="outline" onClick={addRecipient}>
              Add
            </Button>
            <label className="cursor-pointer">
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              <span className="inline-flex items-center px-4 py-2 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary-light">
                Upload List
              </span>
            </label>
          </div>
          {recipients.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {recipients.length} email address{recipients.length !== 1 ? 'es' : ''} added
            </p>
          )}
          {recipients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {recipients.slice(0, 5).map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                >
                  {r}
                  <button
                    type="button"
                    onClick={() => removeRecipient(r)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {recipients.length > 5 && (
                <span className="text-xs text-gray-500">+{recipients.length - 5} more</span>
              )}
            </div>
          )}
        </div>

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Email body..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay between emails (ms)
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={delayBetweenMs}
              onChange={(e) => setDelayBetweenMs(parseInt(e.target.value, 10) || 2000)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly limit
            </label>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 100)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start time (when scheduling begins)
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}
