import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import CreateReport from "./pages/CreateReport";
import ReportDetail from "./pages/ReportDetail";
import Engineers from "./pages/Engineers";
import Quotations from "./pages/Quotations";
import QuotationDetail from "./pages/QuotationDetail";
import Stock from "./pages/Stock";
import Catalog from "./pages/Catalog";
import OnsiteReports from "./pages/OnsiteReports";
import CreateOnsiteReport from "./pages/CreateOnsiteReport";
import OnsiteReportDetail from "./pages/OnsiteReportDetail";
import SuratSerahTerima from "./pages/SuratSerahTerima";
import CreateSurat from "./pages/CreateSurat";
import SuratDetail from "./pages/SuratDetail";
import Layout from "./components/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/create" element={<CreateReport />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/onsite" element={<OnsiteReports />} />
          <Route path="/onsite/create" element={<CreateOnsiteReport />} />
          <Route path="/onsite/:id" element={<OnsiteReportDetail />} />
          <Route path="/surat" element={<SuratSerahTerima />} />
          <Route path="/surat/create" element={<CreateSurat />} />
          <Route path="/surat/:id" element={<SuratDetail />} />
          <Route path="/engineers" element={<Engineers />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:id" element={<QuotationDetail />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/catalog" element={<Catalog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
