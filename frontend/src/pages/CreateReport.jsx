import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateReport() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    report_number: "",
    report_type: "",
    client_name: "",
    project_name: "",
    report_date: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      await API.post("/report/create", {
        ...form,
        data_json: { Notes: "Created from Web UI" },
      });

      toast.success("Report created successfully 🚀");
      navigate("/reports");
    } catch (err) {
      toast.error("Failed to create report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">Create Report</h1>

      <div className="grid grid-cols-2 gap-4">
        <input name="report_number" placeholder="Report Number"
          className="border p-3 rounded"
          onChange={handleChange} />

        <input name="report_type" placeholder="Report Type"
          className="border p-3 rounded"
          onChange={handleChange} />

        <input name="client_name" placeholder="Client Name"
          className="border p-3 rounded"
          onChange={handleChange} />

        <input name="project_name" placeholder="Project Name"
          className="border p-3 rounded"
          onChange={handleChange} />

        <input type="date" name="report_date"
          className="border p-3 rounded col-span-2"
          onChange={handleChange} />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 bg-primary text-white px-6 py-3 rounded hover:bg-secondary transition"
      >
        {loading ? "Creating..." : "Create Report"}
      </button>
    </div>
  );
}
