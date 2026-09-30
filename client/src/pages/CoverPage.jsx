import React from 'react';
import { Link } from 'react-router-dom';

export default function CoverPage() {
  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      {/* Top bar with Login button */}
      <div className="flex items-center justify-end px-6 py-4">
        <Link to="/login" className="btn-primary text-sm px-5 py-2">
          Login
        </Link>
      </div>

      {/* Hero / logo — content to be filled in later */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-900 rounded-full mb-4">
            <span className="font-tamil font-bold text-4xl text-white">அ</span>
          </div>
          <h1 className="font-tamil text-3xl font-bold text-primary-900">கற்போம் கசடற</h1>
          <p className="text-primary-700 text-sm mt-1">Karpom Kasadara — Tamil Language Learning Portal</p>
        </div>
      </div>

      {/* Footer link to the inquiry page */}
      <div className="text-center pb-6 text-sm text-gray-500">
        <Link to="/inquiry" className="hover:underline text-primary-700">Have a question? Contact us</Link>
      </div>
    </div>
  );
}
