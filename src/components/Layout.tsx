import React from 'react';
import { Nav } from './Nav';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#111111] text-white overflow-hidden relative font-sans">
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
             backgroundSize: '100px 100px'
           }}>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto h-screen flex flex-col p-4 md:p-8">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-3xl rounded-[40px] shadow-2xl border border-gray-800/50 flex flex-col h-full overflow-hidden relative">
          <Nav />
          <main className="flex-1 relative overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
