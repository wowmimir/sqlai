import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { AppShell } from './layouts/AppShell';

export default function App() {
  return (
    <BrowserRouter>
      <SignedIn>
        <Routes>
          <Route path="/" element={<AppShell projectId={null} />} />
          <Route path="/project/:projectId" element={<AppShell />} />
        </Routes>
      </SignedIn>
      <SignedOut>
        <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-white">DataChat</h1>
            <p className="text-slate-400">Sign in to access your workspace</p>
            <SignInButton mode="modal">
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>
    </BrowserRouter>
  );
}