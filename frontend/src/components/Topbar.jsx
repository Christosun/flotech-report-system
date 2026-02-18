export default function Topbar({ onMenuClick }) {
  const name = localStorage.getItem("user_name") || "Engineer";

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
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
          <h2 className="text-base lg:text-lg font-bold text-gray-800">Engineering Report System</h2>
          <p className="text-xs text-gray-400 hidden sm:block">Flotech Field Operations</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">{name.charAt(0).toUpperCase()}</span>
        </div>
        <span className="text-sm text-gray-600 hidden sm:block font-medium">{name}</span>
      </div>
    </header>
  );
}