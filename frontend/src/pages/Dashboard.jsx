import StatCard from "../components/StatCard";

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-6">
        <StatCard title="Total Reports" value="12" />
        <StatCard title="Completed" value="8" />
        <StatCard title="Draft" value="4" />
      </div>
    </div>
  );
}
