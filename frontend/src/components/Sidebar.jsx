import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div className="w-64 bg-primary text-white p-6">
      <h1 className="text-2xl font-bold mb-10">FLOTECH</h1>

      <nav className="space-y-4">
        <Link to="/dashboard" className="block hover:text-gray-300">
          Dashboard
        </Link>

        <Link to="/reports" className="block hover:text-gray-300">
          Reports
        </Link>

        <Link to="/reports/create" className="block hover:text-gray-300">
          Create Report
        </Link>
      </nav>
    </div>
  );
}
