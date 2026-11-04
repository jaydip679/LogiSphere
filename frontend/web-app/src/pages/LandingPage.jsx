import React from 'react';
import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/landing/HeroSection';
import PlatformOverview from '../components/landing/PlatformOverview';
import CoreFeatures from '../components/landing/CoreFeatures';
import HowItWorks from '../components/landing/HowItWorks';
import UserSolutions from '../components/landing/UserSolutions';
import PlatformPreview from '../components/landing/PlatformPreview';
import FinalCTA from '../components/landing/FinalCTA';
import Footer from '../components/layout/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Sticky Navigation Header */}
      <Navbar />

      {/* Main Landing Page Content */}
      <main className="flex-1">
        {/* Section 2: Hero Section */}
        <HeroSection />

        {/* Section 3: Platform Overview */}
        <PlatformOverview />

        {/* Section 4: Core Platform Features */}
        <CoreFeatures />

        {/* Section 5: How LogiSphere Works */}
        <HowItWorks />

        {/* Section 6: Solutions for Different Users */}
        <UserSolutions />

        {/* Section 7: Platform Preview */}
        <PlatformPreview />

        {/* Section 8: Final Call to Action */}
        <FinalCTA />
      </main>

      {/* Section 9: Footer */}
      <Footer />
    </div>
  );
}
