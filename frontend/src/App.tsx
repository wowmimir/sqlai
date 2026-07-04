import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import ProjectTest from './components/ProjectTest';
import QueryTest from './components/QueryTest';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-purple-600">📊 DataChat Test Harness</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">v2.0</span>
        </div>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main className="container mx-auto">
        <SignedIn>
          <div className="grid grid-cols-1 gap-8 py-8">
            <ProjectTest />
            <QueryTest />
          </div>
        </SignedIn>
        <SignedOut>
          <div className="p-8 text-center">
            <p className="text-gray-600">Please sign in to continue testing.</p>
          </div>
        </SignedOut>
      </main>
    </div>
  );
}

export default App;