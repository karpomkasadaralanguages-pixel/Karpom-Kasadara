import React from 'react';
import { Link } from 'react-router-dom';
import coverImage from '../assets/cover-classroom.jpg';

export default function CoverPage() {
  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      {/* Top bar with Login button */}
      <div className="flex items-center justify-end px-6 py-4">
        <Link to="/login" className="btn-primary text-sm px-5 py-2">
          Login
        </Link>
      </div>

      {/* Hero */}
      <div className="px-4">
        <div className="max-w-5xl mx-auto text-center pb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-900 rounded-full mb-4">
            <span className="font-tamil font-bold text-4xl text-white">அ</span>
          </div>
          <h1 className="font-tamil text-3xl md:text-4xl font-bold text-primary-900">கற்போம் கசடற</h1>
          <p className="text-primary-700 text-sm md:text-base mt-1">Karpom Kasadara — Tamil Language Learning Portal</p>
        </div>

        {/* Cover image */}
        <div className="max-w-5xl mx-auto mb-10">
          <img
            src={coverImage}
            alt="Children learning Tamil together online"
            className="w-full h-auto rounded-2xl shadow-md object-cover"
          />
        </div>
      </div>

      {/* About Us */}
      <div className="px-4 pb-16">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-primary-100 p-6 md:p-10">
          <h2 className="font-tamil text-2xl font-bold text-primary-900 mb-6 text-center">About Us</h2>

          <div className="space-y-5 text-gray-700 leading-relaxed text-sm md:text-base">
            <p>
              Our Tamil language classes began on January 1, 2021, when a mother in Bangalore approached us to
              teach Tamil to her child. Soon, three more children joined, and the initiative started to grow.
              Later, another parent preparing to relocate from Delhi to Tamil Nadu requested lessons in basic
              Tamil letters and reading skills for their daughter, so she could adapt smoothly to her new school
              environment.
            </p>

            <p>
              Over time, our classes expanded, and today we proudly teach children from different parts of the
              world.
            </p>

            <p>
              Our primary objective is to help children learn Tamil effectively by dedicating just half an hour
              each day after school.
            </p>

            <p>
              In our sessions, students build a strong foundation in Tamil grammar, reading, and writing through
              regular practice worksheets and group discussions.
            </p>

            <p>
              We also conduct separate spoken Tamil classes, where children participate in interactive speaking
              activities designed to improve communication skills. These sessions ensure that learning Tamil is
              not only effective but also enjoyable, helping children connect with and cherish their mother
              tongue.
            </p>
          </div>
        </div>
      </div>

      {/* Footer link to the inquiry page */}
      <div className="text-center pb-6 text-sm text-gray-500">
        <Link to="/inquiry" className="hover:underline text-primary-700">Have a question? Contact us</Link>
      </div>
    </div>
  );
}
