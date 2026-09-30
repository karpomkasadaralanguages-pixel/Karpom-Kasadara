import React from 'react';
import { Link } from 'react-router-dom';
import coverImage from '../assets/cover-classroom.jpg';

const LINKEDIN_URL = 'https://www.linkedin.com/in/karpom-kasadara-languages-5175ab352/';
const AMAZON_URL = 'https://amzn.in/d/0f0EWpb7';

export default function CoverPage() {
  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-primary-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 bg-primary-900 rounded-full shrink-0">
              <span className="font-tamil font-bold text-lg text-white">அ</span>
            </div>
            <div className="leading-tight">
              <p className="font-tamil font-bold text-primary-900 text-base">கற்போம் கசடற</p>
              <p className="text-[11px] text-primary-600 hidden sm:block">Karpom Kasadara</p>
            </div>
          </div>
          <Link to="/login" className="btn-primary text-sm px-5 py-2">
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 md:px-6 pt-10 md:pt-14 pb-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-tamil text-3xl md:text-5xl font-bold text-primary-900 leading-tight">
              கற்போம் கசடற
            </h1>
            <p className="text-primary-800 text-lg md:text-xl font-medium mt-2">
              Karpom Kasadara — Tamil Language Learning Portal
            </p>
            <p className="text-gray-600 mt-4 text-sm md:text-base leading-relaxed max-w-md">
              Helping children around the world build a strong, joyful foundation in Tamil —
              reading, writing and speaking — in just half an hour a day.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/login" className="btn-primary text-sm px-6 py-2.5">
                Login to your account
              </Link>
              <Link
                to="/inquiry"
                className="text-sm px-6 py-2.5 rounded-lg border border-primary-300 text-primary-800 font-medium hover:bg-primary-100 transition-colors"
              >
                Book a demo class
              </Link>
            </div>
          </div>
          <div>
            <img
              src={coverImage}
              alt="Children learning Tamil together online"
              className="w-full h-auto rounded-2xl shadow-lg object-cover"
            />
          </div>
        </div>
      </section>

      {/* Contact / demo CTA banner */}
      <section className="px-4 md:px-6 pb-12">
        <div className="max-w-6xl mx-auto bg-primary-900 rounded-2xl px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div>
            <h2 className="text-white text-lg md:text-xl font-semibold">
              Want to see a class for yourself?
            </h2>
            <p className="text-primary-100 text-sm md:text-base mt-1">
              If you want to book a demo class or have other questions, contact us at
            </p>
          </div>
          <Link
            to="/inquiry"
            className="shrink-0 bg-white text-primary-900 font-semibold text-sm px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* About Us */}
      <section className="px-4 md:px-6 pb-12">
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
      </section>

      {/* Books published by our teachers */}
      <section className="px-4 md:px-6 pb-14">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-primary-100 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          <div>
            <h2 className="text-primary-900 text-lg md:text-xl font-semibold">Books Published by Our Teachers</h2>
            <p className="text-gray-600 text-sm md:text-base mt-1">
              Explore Tamil learning books written by our own teaching team, available on Amazon.
            </p>
          </div>
          <a
            href={AMAZON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-primary-900 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:bg-primary-800 transition-colors"
          >
            Shop on Amazon
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-primary-900 text-primary-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="font-tamil">கற்போம் கசடற — Karpom Kasadara</p>
          <div className="flex items-center gap-5">
            <Link to="/inquiry" className="hover:text-white hover:underline transition-colors">
              Have a question? Contact us
            </Link>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white hover:underline transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
