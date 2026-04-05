import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

// Lazy load semua halaman — hanya diload saat dibuka
const Login             = lazy(() => import("./pages/Login"));
const Dashboard         = lazy(() => import("./pages/Dashboard"));
const Reports           = lazy(() => import("./pages/Reports"));
const CreateReport      = lazy(() => import("./pages/CreateReport"));
const ReportDetail      = lazy(() => import("./pages/ReportDetail"));
const Engineers         = lazy(() => import("./pages/Engineers"));
const Quotations        = lazy(() => import("./pages/Quotations"));
const QuotationDetail   = lazy(() => import("./pages/QuotationDetail"));
const Stock             = lazy(() => import("./pages/Stock"));
const Catalog           = lazy(() => import("./pages/Catalog"));
const OnsiteReports     = lazy(() => import("./pages/OnsiteReports"));
const CreateOnsiteReport= lazy(() => import("./pages/CreateOnsiteReport"));
const OnsiteReportDetail= lazy(() => import("./pages/OnsiteReportDetail"));
const SuratSerahTerima  = lazy(() => import("./pages/SuratSerahTerima"));
const CreateSurat       = lazy(() => import("./pages/CreateSurat"));
const SuratDetail       = lazy(() => import("./pages/SuratDetail"));
const SuratResmi        = lazy(() => import("./pages/SuratResmi"));
const LeaveManagement   = lazy(() => import("./pages/LeaveManagement"));
const UserManagement    = lazy(() => import("./pages/UserManagement"));

// Loading fallback saat halaman sedang diload
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/reports"          element={<Reports />} />
            <Route path="/reports/create"   element={<CreateReport />} />
            <Route path="/reports/:id"      element={<ReportDetail />} />
            <Route path="/onsite"           element={<OnsiteReports />} />
            <Route path="/onsite/create"    element={<CreateOnsiteReport />} />
            <Route path="/onsite/:id"       element={<OnsiteReportDetail />} />
            <Route path="/surat"            element={<SuratSerahTerima />} />
            <Route path="/surat/create"     element={<CreateSurat />} />
            <Route path="/surat/:id"        element={<SuratDetail />} />
            <Route path="/engineers"        element={<Engineers />} />
            <Route path="/quotations"       element={<Quotations />} />
            <Route path="/quotations/:id"   element={<QuotationDetail />} />
            <Route path="/stock"            element={<Stock />} />
            <Route path="/catalog"          element={<Catalog />} />
            <Route path="/surat-resmi"      element={<SuratResmi />} />
            <Route path="/leave"            element={<LeaveManagement />} />
            <Route path="/users"            element={<UserManagement />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;