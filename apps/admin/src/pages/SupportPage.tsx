import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { Empty, ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { SupportMessage, SupportThread } from '../types';

export function SupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);

  async function loadThreads() {
    setError(null);
    try {
      setThreads(await adminApi.support(status));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load support.');
    }
  }
  async function open(thread: SupportThread) {
    setSelected(thread);
    try {
      setMessages(await adminApi.messages(thread.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load messages.');
    }
  }
  useEffect(() => {
    void loadThreads();
  }, [status]);

  async function send() {
    if (!selected || !reply.trim()) return;
    try {
      await adminApi.reply(selected.id, reply);
      setReply('');
      await open(selected);
      await loadThreads();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send reply.');
    }
  }

  async function resolve() {
    if (!selected) return;
    await adminApi.supportStatus(selected.id, 'resolved');
    setSelected(null);
    await loadThreads();
  }

  return (
    <>
      <PageHeader
        eyebrow="Private async inbox"
        title="Support"
        description="No user-to-user chat, no presence service, and no real-time listener costs."
        action={<button onClick={() => void loadThreads()}>Refresh</button>}
      />
      <ErrorBanner error={error} />
      <div className="support-layout">
        <Panel className="thread-list">
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="waiting_on_user">Waiting on user</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          {threads.length ? (
            threads.map((thread) => (
              <button
                key={thread.id}
                className={selected?.id === thread.id ? 'thread active' : 'thread'}
                onClick={() => void open(thread)}
              >
                <strong>{thread.subject}</strong>
                <span>{thread.platform} · {thread.appVersion}</span>
                <small>
                  {thread.status.replaceAll('_', ' ')}
                  {thread.unreadByAdmin ? ` · ${thread.unreadByAdmin} new` : ''}
                </small>
              </button>
            ))
          ) : (
            <Empty>No conversations in this view.</Empty>
          )}
        </Panel>
        <Panel className="conversation">
          {selected ? (
            <>
              <div className="conversation-title">
                <div>
                  <h2>{selected.subject}</h2>
                  <code>{selected.ownerId}</code>
                </div>
                <button className="secondary" onClick={() => void resolve()}>
                  Resolve
                </button>
              </div>
              <div className="messages">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.author === 'admin' ? 'message admin' : 'message user'}
                  >
                    <p>{message.text}</p>
                    <small>
                      {message.author} · {new Date(message.createdAt).toLocaleString()}
                    </small>
                  </article>
                ))}
              </div>
              <label>
                Reply
                <textarea
                  rows={5}
                  maxLength={4000}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                />
              </label>
              <button disabled={!reply.trim()} onClick={() => void send()}>
                Send reply
              </button>
            </>
          ) : (
            <Empty>Select a conversation.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
