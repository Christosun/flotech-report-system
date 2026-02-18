import { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchReports = async () => {
    try {
      const res = await API.get("/report/list"); // pastikan backend ada endpoint ini
      setReports(res.data);
    } catch (err) {
      console.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const downloadPDF = async (id) => {
    const response = await API.get(`/report/pdf/${id}`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `report_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
  };

  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {reports.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow">
          No reports available.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Report No</th>
                <th className="p-4">Client</th>
                <th className="p-4">Project</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t">
                  <td className="p-4">{report.report_number}</td>
                  <td className="p-4">{report.client_name}</td>
                  <td className="p-4">{report.project_name}</td>
                  <td className="p-4">{report.report_type}</td>
                  <td className="p-4">{report.status}</td>
                  <td className="p-4 space-x-2">
                    <button
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="px-3 py-1 bg-secondary text-white rounded"
                    >
                      View
                    </button>

                    <button
                      onClick={() => downloadPDF(report.id)}
                      className="px-3 py-1 bg-primary text-white rounded"
                    >
                      PDF
                    </button>

                    <button
                      onClick={async () => {
                        await API.delete(`/report/delete/${report.id}`);
                        toast.success("Report deleted");
                        window.location.reload();
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      Delete
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
