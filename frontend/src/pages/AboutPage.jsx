import React from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Logo from '../components/Logo';

const AboutPage = () => {

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      {/* Content */}
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-display">
              About OrderEasy
            </h1>
            <p className="text-xl text-text-secondary">
              Your multi-restaurant reservation and ordering platform
            </p>
          </div>
          {/* Mission Section */}
          <div className="bg-dark-card rounded-3xl p-8 border border-dark-surface">
            <h2 className="text-2xl font-bold text-brand-lime mb-4">Our Mission</h2>
            <p className="text-text-secondary leading-relaxed">
              OrderEasy is revolutionizing the dining experience by connecting hungry customers
              with their favorite restaurants through a seamless digital platform. We make it
              easy to discover restaurants, reserve tables, and place orders - all in one place.
            </p>
          </div>

          {/* What We Do */}
          <div className="bg-dark-card rounded-3xl p-8 border border-dark-surface">
            <h2 className="text-2xl font-bold text-brand-lime mb-6">What We Do</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-brand-orange/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Browse Restaurants
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Discover restaurants with search filters, cuisine types, and location-based recommendations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-brand-orange/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Reserve Tables
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Book tables in advance with real-time availability checking and instant confirmations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-brand-orange/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    QR Code Ordering
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Scan QR codes at your table to view menus and place orders directly from your phone.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-brand-orange/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    Real-Time Updates
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Stay informed with live order status updates and kitchen notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Why Choose Us */}
          <div className="bg-dark-card rounded-3xl p-8 border border-dark-surface">
            <h2 className="text-2xl font-bold text-brand-lime mb-6">Why Choose OrderEasy?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-brand-orange text-xl">✓</div>
                <div>
                  <h3 className="text-text-primary font-semibold mb-1">Multi-Restaurant Platform</h3>
                  <p className="text-text-secondary text-sm">
                    Browse and order from multiple restaurants in one convenient app.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-brand-orange text-xl">✓</div>
                <div>
                  <h3 className="text-text-primary font-semibold mb-1">Seamless Experience</h3>
                  <p className="text-text-secondary text-sm">
                    From browsing to ordering, everything is designed for simplicity and speed.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-brand-orange text-xl">✓</div>
                <div>
                  <h3 className="text-text-primary font-semibold mb-1">24/7 Availability</h3>
                  <p className="text-text-secondary text-sm">
                    Browse restaurants and make reservations anytime, anywhere.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-brand-orange text-xl">✓</div>
                <div>
                  <h3 className="text-text-primary font-semibold mb-1">Secure & Reliable</h3>
                  <p className="text-text-secondary text-sm">
                    Your data is protected with industry-standard security measures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="bg-gradient-to-r from-brand-orange to-brand-orange/80 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Have Questions?
            </h2>
            <p className="text-white/90 mb-6">
              We're here to help! Reach out to our support team anytime.
            </p>
            <a
              href="mailto:support@ordereasy.com"
              className="inline-block bg-white text-brand-orange px-8 py-3 rounded-full font-bold hover:bg-white/90 transition-all"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
