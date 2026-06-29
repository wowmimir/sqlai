import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import ProjectTest from './components/ProjectTest';
import QueryTest from './components/QueryTest';

function App() {
  return (
    <div>
      <header className="flex justify-between p-4 border-b">
        <h1>DataChat Test Harness</h1>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      <main>
        <SignedIn>
          <ProjectTest />
          <QueryTest />
        </SignedIn>
        <SignedOut>
          <p className="p-8">Please sign in to continue.</p>
        </SignedOut>
      </main>
    </div>
  );
}

export default App;
