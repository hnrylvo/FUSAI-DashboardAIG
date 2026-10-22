import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Footer } from './Footer';

export interface LayoutWrapperProps {
  children: React.ReactNode;
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Collapsible Vertical Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <FilterBar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 lg:px-8 py-5">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};
