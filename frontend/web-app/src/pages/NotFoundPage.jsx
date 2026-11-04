import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 mb-6">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-navy-900 tracking-tight mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Destination Route Not Found</h2>
      <p className="text-sm text-slate-600 max-w-md mb-8">
        The corridor or screen you requested does not exist or may have moved.
      </p>
      <Button to="/" variant="primary" size="md" icon={Home} iconPosition="left">
        Return to LogiSphere Homepage
      </Button>
    </div>
  );
}
