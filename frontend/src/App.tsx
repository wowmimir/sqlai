import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';  // adjust path if needed
import ProjectTest from './components/ProjectTest';
import QueryTest from './components/QueryTest';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex justify-between items-center p-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-purple-600">📊 SqlAI</h1>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">v2.0</span>
        </div>
        <SignedOut>
          <SignInButton>
            <Button variant="default">Sign In</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main className="container mx-auto px-4 py-6">
        <SignedIn>
          <div className="grid grid-cols-1 gap-8">
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