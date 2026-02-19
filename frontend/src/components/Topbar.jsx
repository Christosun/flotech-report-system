import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/dashboard": { title: "Dashboard", sub: "Overview & Analytics" },
  "/reports": { title: "Field Reports", sub: "Engineering site reports" },
  "/reports/create": { title: "New Report", sub: "Create field report" },
  "/engineers": { title: "Engineers", sub: "Team & profiles" },
  "/quotations": { title: "Quotations", sub: "Sales & proposals" },
  "/stock": { title: "Stock & Demo Units", sub: "Inventory management" },
  "/catalog": { title: "Catalogs & Manuals", sub: "Product documents" },
};

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const current = PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/reports/") ? { title: "Report Detail", sub: "Field report view" } :
     location.pathname.startsWith("/quotations/") ? { title: "Quotation Detail", sub: "Quotation view" } :
    { title: "Flotech", sub: "" });
  const name = localStorage.getItem("user_name") || "User";

  return (
    <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800 leading-tight">{current.title}</h2>
          <p className="text-xs text-gray-400 hidden sm:block">{current.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-semibold text-gray-700">{name}</p>
          <p className="text-xs text-gray-400">PT Flotech Controls Indonesia</p>
        </div>
        <div className="w-9 h-9 bg-[#0B3D91] rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
