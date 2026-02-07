'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { ComposeModal } from '@/components/ComposeModal';
import { api, ScheduledEmail, SentEmail } from '@/lib/api';

type Tab = 'scheduled' | 'sent';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;
  return `${d.toLocaleDateString()}, ${timeStr}`;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('scheduled');
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  const [sent, setSent] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [s, sentData] = await Promise.all([api.getScheduled(), api.getSent()]);
      setScheduled(s);
      setSent(sentData);
    } catch {
      setScheduled([]);
      setSent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchData();
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [tab, user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-4 flex flex-col shrink-0">
          <Button
            variant="primary"
            className="w-full mb-6"
            onClick={() => setComposeOpen(true)}
          >
            Compose
          </Button>

          <nav className="space-y-1">
            <button
              onClick={() => setTab('scheduled')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                tab === 'scheduled'
                  ? 'bg-primary-light text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Scheduled ({scheduled.length})
            </button>
            <button
              onClick={() => setTab('sent')}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                tab === 'sent'
                  ? 'bg-primary-light text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Sent ({sent.length})
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6 bg-gray-50">
          {tab === 'scheduled' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Emails</h2>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
              ) : scheduled.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-600 text-lg mb-2">No Scheduled Emails Yet!</p>
                  <p className="text-gray-500 mb-6">
                    Click &apos;Compose&apos; to schedule your first email.
                  </p>
                  <Button variant="primary" onClick={() => setComposeOpen(true)}>
                    Compose New Email
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            To
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Subject
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Scheduled Time
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {scheduled.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{row.to}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{row.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDateTime(row.scheduledTime)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  row.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-primary-light text-primary'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'sent' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sent Emails</h2>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                </div>
              ) : sent.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <p className="text-gray-600 text-lg mb-2">No Sent Emails Yet!</p>
                  <p className="text-gray-500 mb-6">
                    Emails you send will appear here.
                  </p>
                  <Button variant="primary" onClick={() => setComposeOpen(true)}>
                    Compose New Email
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            To
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Subject
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Sent Time
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sent.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900">{row.to}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{row.subject}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDateTime(row.sentAt)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  row.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
