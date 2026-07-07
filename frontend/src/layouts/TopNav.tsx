import { UserButton } from '@clerk/clerk-react';

export function TopNav() {
  return (
    <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50">
      {/* Logo / App Name */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-600" /> {/* Placeholder icon */}
        <span className="font-semibold text-white text-lg">SqlAI</span>
      </div>

      {/* Right: User Button */}
      <UserButton 
        appearance={{
          elements: {
            avatarBox: "w-8 h-8"
          }
        }}
      />
    </div>
  );
}