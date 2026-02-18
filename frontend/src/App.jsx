import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import CreateReport from "./pages/CreateReport";
import ReportDetail from "./pages/ReportDetail";
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
