import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await API.get(`/report/detail/${id}`);
      setReport(res.data);
    } catch (err) {
      toast.error("Failed to load report");
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFiles = async (files) => {
    const formData = new FormData();

    for (let file of files) {
      formData.append("images", file);
    }

    try {
      setUploading(true);

      await API.post(`/report/upload/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Images uploaded successfully 🚀");
      fetchReport(); // refresh images without reload
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  if (!report) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Report {report.report_number}
      </h1>

      {/* INFO CARD */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <p><b>Client:</b> {report.client_name}</p>
        <p><b>Project:</b> {report.project_name}</p>
        <p><b>Status:</b> {report.status}</p>
      </div>

      {/* DRAG & DROP UPLOAD AREA */}
      <div
        className={`border-2 border-dashed p-8 text-center rounded-xl mb-8 transition 
        ${dragActive ? "border-primary bg-blue-50" : "border-gray-300"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <p className="text-gray-600 mb-3">
          Drag & Drop images here
        </p>

        <p className="text-sm text-gray-400 mb-4">
          or click to browse
        </p>

        <input
          type="file"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="fileUpload"
        />

        <label
          htmlFor="fileUpload"
          className="cursor-pointer bg-primary text-white px-4 py-2 rounded hover:bg-secondary transition"
        >
          Select Images
        </label>

        {uploading && (
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW GRID */}
      {report.images.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Attachment Photos
          </h2>

          <div className="grid grid-cols-3 gap-4">
            {report.images.map((img) => (
              <img
                key={img.id}
                src={`http://127.0.0.1:5000/${img.file_path}`}
                alt="attachment"
                className="rounded-xl shadow hover:scale-105 transition duration-300"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
