import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Building2, 
  Package, 
  ShoppingCart,  
  ReceiptIndianRupee,
  FileText,
  BookOpen,  
  Download, 
  Database,
  BarChart3,
  Settings,
  LogOut,
  ArrowRightLeft,
  IndianRupee,
  Menu,
  ClipboardList,
  MessageSquareShare,
  X,
  Warehouse,
  BadgeIndianRupee,
  User, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import svi from '../Assets/SVILogo.png'

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Layout = ({ children, user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [hoverTriggered, setHoverTriggered] = useState(false);
  const location = useLocation(); 
  const [overallDiscount, setOverallDiscount] = useState(0);
  const hoverTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Purchase', href: '/purchase', icon: ShoppingCart },
    { name: 'Purchase History', href: '/purchase-history', icon: ShoppingCart },
    { name: 'Purchase Order', href: '/purchase-order', icon: ClipboardList },
    { name: 'Billing', href: '/billing', icon: ReceiptIndianRupee },
    { name: 'Sales History', href: '/sales-history', icon: FileText },
    { name: 'Credit & Debit Note', href: '/coming-soon', icon: ArrowRightLeft },
    { name: 'To Branch/Godown', href: '/coming-soon1', icon: Warehouse },
    { name: 'Ledger', href: '/ledger', icon: BookOpen }, 
    { name: 'Banking', href: '/banking', icon: IndianRupee }, 
    { name: 'Analytics', href: '/analytics', icon: BarChart3 }, 
    { name: 'Export', href: '/export', icon: Download }, 
    // { name: 'openingstock', href: '/openingstock', icon: Download }, 
    
    { name: 'Backup', href: '/backup', icon: Database },
    { name: 'Admin', href: '/admin', icon: Settings },
    { name: 'Company', href: '/company', icon: Building2 },
    { name: 'Contact Us', href: '/contact', icon: MessageSquareShare },
  ];

  // Handle ESC key to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        
        // On mobile, toggle mobile sidebar
        if (window.innerWidth < 1024) {
          setSidebarOpen(prev => !prev);
        } 
        // On desktop, toggle collapsed state
        else {
          setDesktopSidebarCollapsed(prev => !prev);
          setHoverTriggered(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle mouse position for auto-expand on left edge
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Only trigger on desktop when sidebar is collapsed
      if (window.innerWidth >= 1024 && desktopSidebarCollapsed) {
        // If mouse is within 10px of left edge
        if (e.clientX <= 10) {
          if (!hoverTimeoutRef.current && !hoverTriggered) {
            hoverTimeoutRef.current = setTimeout(() => {
              setHoverTriggered(true);
            }, 3000); // 3 seconds
          }
        } else {
          // Clear timeout if mouse moves away
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [desktopSidebarCollapsed, hoverTriggered]);

  // Handle click outside sidebar to close when auto-expanded
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hoverTriggered && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setHoverTriggered(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hoverTriggered]);

  // Handle menu item click - close auto-expanded sidebar
  const handleMenuItemClick = () => {
     setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
    setHoverTriggered(false); 
  };

  // Toggle desktop sidebar collapse
  const toggleDesktopSidebar = () => {
    setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
    setHoverTriggered(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200"> 
              <h1 className="text-xl font-bold text-gray-900">SV's BizzSaathi</h1>
              <button tabIndex={-1} onClick={() => setSidebarOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5" /> 
              </button>  
            </div> 
            <div className="flex flex-col flex-1 pt-4 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return ( 
                  <NavLink
                    key={item.name}
                    to={item.href}
                    tabIndex={-1}
                    onClick={handleMenuItemClick}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-3 border-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav 
        ref={sidebarRef}
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out z-30 ${
          desktopSidebarCollapsed && !hoverTriggered ? 'lg:w-0' : 'lg:w-64'
        }`}
        style={{
          overflow: desktopSidebarCollapsed && !hoverTriggered ? 'hidden' : 'visible'
        }}
      >
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">SV's BizzSaathi</h1>
        </div>
        <div className="flex flex-col flex-1 pt-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href} 
                tabIndex={-1}
                onClick={handleMenuItemClick}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`} 
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Collapse/Expand Toggle Button - Desktop Only */}
      <button
        onClick={toggleDesktopSidebar}
        tabIndex={-1}
        className={`hidden lg:block fixed top-14 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-r-lg shadow-lg transition-all duration-300 ease-in-out z-40 ${
          desktopSidebarCollapsed && !hoverTriggered ? 'left-0' : 'left-64'
        }`}
        title={`${desktopSidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar (ESC)`}
      >
        {desktopSidebarCollapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        desktopSidebarCollapsed && !hoverTriggered ? 'lg:pl-0' : 'lg:pl-64'
      }`}>
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              title="Open Sidebar (ESC)"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {/^\/sale\/\d+$/.test(location.pathname)
                ? 'Sale Details'
                : /^\/saleedit\/\d+$/.test(location.pathname)
                ? 'Edit Sale'
                : location.pathname.slice(1).replace(/-/g, ' ') || 'Dashboard'}
            </h2> 

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700">{user?.username}</span>
              </div>
              <button
                onClick={onLogout}
                tabIndex={-1}  
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>
  
        {/* Page content */} 
        <main className="p-6 pb-18"> 
          {children}
        </main> 
        {/* <footer className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 text-center py-2 z-50 shadow-sm">
          <span className="text-sm text-gray-500">
            © {new Date().getFullYear()} S V IT Hub. All rights reserved. | Licensed Professional Services Provider
          </span>
        </footer> */}
      </div>
    </div> 
  );
};

export default Layout;