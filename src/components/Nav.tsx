import React from 'react';
import { Gamepad2, ShoppingCart, Gift, Bell, Activity, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export function Nav() {
  return (
    <nav className="w-full flex items-center justify-between py-6 px-12 z-50 relative">
      {/* Left Section */}
      <div className="flex items-center space-x-8 text-sm font-medium tracking-wide">
        <button className="flex items-center space-x-2 text-white hover:text-gray-300 transition-colors">
          <Gamepad2 size={18} />
          <span>Games</span>
        </button>
        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <ShoppingCart size={18} />
          <span>Store</span>
        </button>
        <div className="flex items-center space-x-2 text-[#a3e635]">
          <Gift size={18} />
          <span>5 Months • Free Access</span>
        </div>
      </div>

      {/* Center Logo (Nintendo-style) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
          {/* Simple representation of the logo */}
          <div className="flex space-x-1">
            <div className="w-3 h-6 border-2 border-black rounded-full"></div>
            <div className="w-3 h-6 bg-black rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-6">
        <button className="text-gray-400 hover:text-white transition-colors">
          <Activity size={20} />
        </button>
        <button className="text-gray-400 hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        {/* Coins Badge */}
        <div className="flex items-center bg-[#1a1a1a] rounded-full p-1 pl-3 pr-1 border border-gray-800">
          <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mr-2">
            <span className="text-black text-[10px] font-bold">W</span>
          </div>
          <span className="font-mono text-sm mr-3">28.105.820</span>
          <button className="w-6 h-6 bg-[#a3e635] rounded-full flex items-center justify-center text-black hover:bg-[#bef264] transition-colors">
            <Plus size={14} />
          </button>
        </div>

        {/* Profile */}
        <div className="relative">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-700">
            <img src="https://picsum.photos/seed/avatar/100/100" alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
        </div>
      </div>
    </nav>
  );
}
