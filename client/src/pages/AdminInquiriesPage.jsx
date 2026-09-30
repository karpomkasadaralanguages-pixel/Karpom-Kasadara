import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/inquiries');
    setInquiries(data.inquiries);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRead = async inq => {
    await api.patch(`/inquiries/${inq.id}`, { isRead: !inq.isRead });
    setInquiries(list => list.map(i => i.id === inq.id ? { ...i, isRead: !i.isRead } : i));
  };

  const handleDelete = async id => {
    if (!confirm('Delete this inquiry?')) return;
    await api.delete(`/inquiries/${id}`);
    setInquiries(list => list.filter(i => i.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Inquiries</h1>
        <p className="text-sm text-gray-500">Messages submitted through the website's contact form</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No inquiries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inq => (
            <div key={inq.id} className={`card border-l-4 ${inq.isRead ? 'border-gray-200' : 'border-primary-600'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{inq.name}</span>
                    {!inq.isRead && <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-800">New</span>}
                  </div>
                  <p className="text-xs text-gray-500">{inq.email}{inq.phone ? ` · ${inq.phone}` : ''}</p>
                  <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{inq.message}</p>
                  <div className="text-xs text-gray-400 mt-2">{new Date(inq.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => toggleRead(inq)} className="text-xs text-gray-500 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50">
                    {inq.isRead ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button onClick={() => handleDelete(inq.id)} className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
