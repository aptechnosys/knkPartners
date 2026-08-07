import API from "../api/axios";

// =============================
// Bulk Upload
// =============================
export const bulkUploadCases = async (excel, zip) => {
  const formData = new FormData();

  formData.append("excel", excel);
  formData.append("zip", zip);

  const { data } = await API.post(
    "/cases/bulk-upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
};

// =============================
// Bulk Status Update
// =============================
export const bulkUpdateStatus = async (comp_ref_nos) => {
  const { data } = await API.put("/cases/bulk-status", {
    comp_ref_nos,
    check_status: "IN_PROGRESS",
  });

  return data;
};