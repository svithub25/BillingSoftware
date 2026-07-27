import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Components
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import Purchase from "./components/Purchase";
import Billing from "./components/Billing";
import SalesHistory from "./components/SalesHistory";
import Ledger from "./components/Ledger";
import Export from "./components/Export";
import Backup from "./components/Backup";
import ComingSoon from "./components/ComingSoon";
import Banking from "./components/Banking/index";
import Analytics from "./components/Analytics";
import Admin from "./components/Admin";
import ItemDetails from "./components/ItemDetails";
import PurchaseDetails from "./components/PurchaseDetails";
import SaleDetails from "./components/SaleDetails";
import PurchaseOrder from "./components/PurchaseOrder";
import PurchaseHistory from "./components/PurchaseHistory";
import Layout from "./components/Layout";
import ShortcutHelp from "./components/ShortcutHelp";
import PurchaseEdit from "./components/PurchaseEdit";
import SaleEdit from "./components/SaleEdit";
import Contactus from "./components/Contactus";
import OpeningStockManagement from "./components/Openingstock/OpeningStockManagement"
import Company from "./components/Company";
import CreditDebitNote from "./components/CreditDebitNote";
import CreditDebitNoteDetails from "./components/CreditDebitNoteDetails";
import CreditDebitNoteEdit from "./components/CreditDebitNoteEdit";
import BranchGoDown from "./components/BranchGoDown";
import DynamicReports from "./components/DynamicReports";
import Settings from "./components/Settings";
import Contacts from "./components/Contacts";
import AccountGroups from "./components/AccountGroups";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const navigate = useNavigate();

  // Global Hotkeys
  useHotkeys("ctrl+d", () => navigate("/dashboard"), [navigate]);
  useHotkeys("ctrl+i", () => navigate("/inventory"), [navigate]);
  useHotkeys("ctrl+p", () => navigate("/purchase"), [navigate]);
  useHotkeys("ctrl+o", () => navigate("/purchase-order"), [navigate]);
  useHotkeys("ctrl+b", () => navigate("/billing"), [navigate]);
  useHotkeys("ctrl+h", () => navigate("/sales-history"), [navigate]);
  useHotkeys("ctrl+l", () => navigate("/ledger"), [navigate]);
  useHotkeys("ctrl+u", () => navigate("/company"), [navigate]);
  useHotkeys("ctrl+y", () => navigate("/analytics"), [navigate]);
  useHotkeys("ctrl+g", () => navigate("/branch-godown"), [navigate]);
  useHotkeys("ctrl+t", () => navigate("/dynamic-reports"), [navigate]);
  useHotkeys("ctrl+q", () => navigate("/credit-debit-note"), [navigate]);
  useHotkeys("ctrl+e", () => navigate("/export"), [navigate]);
  useHotkeys("ctrl+n", () => navigate("/admin"), [navigate]);
  useHotkeys("ctrl+k", () => navigate("/banking"), [navigate]);

  // useHotkeys("ctrl+t", () => {setShowShortcutHelp(true);
  //  console.log("Shortcut Help Opened");  
  // }, [setShowShortcutHelp]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem("user");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/company" element={<Company />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/purchase-history" element={<PurchaseHistory />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/sales-history" element={<SalesHistory />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/export" element={<Export />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/dynamic-reports" element={<DynamicReports />} />
          <Route path="/banking" element={<Banking />} />
          <Route path="/openingstock" element={<OpeningStockManagement />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/item/:id" element={<ItemDetails />} />
          <Route path="/purchase/:id" element={<PurchaseDetails />} />
          <Route path="/purchaseupdate/:id" element={<PurchaseEdit />} />
          <Route path="/sale/:id" element={<SaleDetails />} />
          <Route path="/saleedit/:id" element={<SaleEdit />} />
          <Route path="/purchase-order" element={<PurchaseOrder />} />
          <Route path="/credit-debit-note" element={<CreditDebitNote />} />
          <Route path="/credit-debit-note/new" element={<CreditDebitNoteEdit />} />
          <Route path="/credit-debit-note/:id" element={<CreditDebitNoteDetails />} />
          <Route path="/credit-debit-note/:id/edit" element={<CreditDebitNoteEdit />} />
          <Route path="/branch-godown" element={<BranchGoDown />} />
          <Route path="/coming-soon2" element={<ComingSoon />} />
          <Route path="/contact" element={<Contactus />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/alter" element={<Contacts />} />
          <Route path="/account-groups" element={<AccountGroups />} />
        </Routes>
      </Layout>

      {showShortcutHelp && (
        <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />
      )}
    </>
  );
};

export default App; 