import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { toast } from "react-toastify";
import {
  bulkUpdateStatus,
} from "../services/caseService";
import {
  MdSearch,
  MdClear,
  MdVisibility,
  MdChevronLeft,
  MdChevronRight
} from "react-icons/md";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { MdDownload } from "react-icons/md";
export default function Cases() {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const overdueFilter =
    searchParams.get("overdue");

  const [status, setStatus] = useState(
    searchParams.get("status") || ""
  );

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCases, setSelectedCases] = useState([]);

  const selectedCount = selectedCases.length;


  // debounce typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);

  }, [search]);


  const fetchCases = useCallback(
   async (
      pg = page,
      s = debouncedSearch,
      st = status,
      overdue = overdueFilter
    ) => {

      setLoading(true);

      try {

        let url =
          `/cases?page=${pg}&limit=100`;

        if (s)
          url += `&search=${encodeURIComponent(s)}`;

          if (overdue === "true") {
            url += "&overdue=true";
          } else if (st) {
            url += `&status=${encodeURIComponent(st)}`;
          }

        const res = await API.get(url);

        setCases(res.data.data || []);

        setTotalPages(
          res.data.totalPages || 1
        );

        setTotal(
          res.data.total || 0
        );

      }
      catch (err) {
        console.log(err);
      }
      finally {
        setLoading(false);
      }

    },
    [page, debouncedSearch, status, overdueFilter]
  );


 // fetch whenever page/search/url filter changes
useEffect(() => {

  const urlStatus =
    searchParams.get("status") || "";

  const overdue =
    searchParams.get("overdue");

  setStatus(urlStatus);

  fetchCases(
    page,
    debouncedSearch,
    urlStatus,
    overdue
  );

}, [
  page,
  debouncedSearch,
  searchParams,
  fetchCases
]);


 const handleClear = () => {

  setSearch("");
  setStatus("");
  setPage(1);

  navigate("/cases", {
    replace: true
  });

};

// for archiving a case

const archiveCase = async (id) => {
  try {
    const confirmArchive = window.confirm(
      "Archive this case?"
    );

    if (!confirmArchive) return;

    await API.patch(
      `/cases/${id}/archive`
    );

    alert("Case archived successfully");

    fetchCases();
  } catch (error) {
    console.error(error);

    alert(
      error?.response?.data?.message ||
      "Failed to archive case"
    );
  }
};

// for exporting new cases to excel

const exportNewCases = async () => {
  try {
    const res = await API.get(
      "/cases?status=NEW&page=1&limit=1000"
    );

    const cases = res.data.data || [];

    if (!cases.length) {
      alert("No New Cases found.");
      return;
    }

    const exportData = cases.map((item) => ({
          // Existing Data
          "Reference No": item.comp_ref_no || "-",
          Candidate: item.candidate_name || "-",
          "Father Name": item.father_name || "-",

          DOB: item.candidate_dob
            ? new Date(item.candidate_dob).toLocaleDateString("en-GB")
            : "",

          City: item.city || "",
          State: item.state || "",
          Vendor: item.vendor || "",

          // Existing status (read only)
          Status: item.check_status || "NEW",

          "Assigned To":
            item.assignedTo?.email || "Unassigned",

          TAT: item.tat || "",
          Remark: item.remark || "",

          "Created At": item.createdAt
            ? new Date(item.createdAt).toLocaleString()
            : "",

          // ============================
          // Client fills these columns
          // ============================

          "Verification Date": "",

          "Colour Code": "",

          "Verify Status": "",

          "File Name": "",
        }));

    const worksheet =
      XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = Object.keys(exportData[0]).map(
      (key) => ({
        wch:
          Math.max(
            key.length,
            ...exportData.map((r) =>
              String(r[key] || "").length
            )
          ) + 5,
      })
    );

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "New Cases"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `KNK_New_Cases_${new Date()
        .toISOString()
        .slice(0, 100)}.xlsx`
    );
  } catch (err) {
    console.error(err);
    alert("Failed to export New Cases.");
  }
};

// for multiple case selection and bulk export to excel and status update
const toggleCaseSelection = (refNo) => {
  setSelectedCases((prev) => {
    if (prev.includes(refNo)) {
      return prev.filter((id) => id !== refNo);
    }

    if (prev.length >= 100) {
      alert("Maximum 100 cases can be selected.");
      return prev;
    }

    return [...prev, refNo];
  });
};

//header checkbox to select all cases on current page
const handleSelectAll = () => {
  const selectableCases = cases
    .filter((c) => c.check_status === "NEW")
    .slice(0, 100)
    .map((c) => c.comp_ref_no);

  if (selectedCases.length === selectableCases.length) {
    setSelectedCases([]);
  } else {
    setSelectedCases(selectableCases);
  }
};

// export selected cases to excel
const exportSelectedCases = async () => {
  try {
    if (!selectedCases.length) {
      toast.error("Please select at least one case.");
      return;
    }

    if (selectedCases.length > 100) {
      toast.error("Maximum 100 cases can be exported.");
      return;
    }

    const res = await API.get(
      `/cases?status=NEW&page=1&limit=1000`
    );

    const cases = res.data.data || [];

    const selected = cases.filter((item) =>
      selectedCases.includes(item.comp_ref_no)
    );

    if (!selected.length) {
      toast.error("No selected cases found.");
      return;
    }

    const exportData = selected.map((item) => ({
      "Reference No": item.comp_ref_no || "-",
      Candidate: item.candidate_name || "-",
      "Father Name": item.father_name || "-",

      DOB: item.candidate_dob
        ? new Date(item.candidate_dob).toLocaleDateString("en-GB")
        : "",

      City: item.city || "",
      State: item.state || "",
      Vendor: item.vendor || "",

      Status: item.check_status || "NEW",

      "Assigned To":
        item.assignedTo?.email || "Unassigned",

      TAT: item.tat || "",
      Remark: item.remark || "",

      "Created At": item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : "",

      "Verification Date": "",
      "Colour Code": "",
      "Verify Status": "",
      "File Name": "",
    }));

    const worksheet =
      XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = Object.keys(exportData[0]).map(
      (key) => ({
        wch:
          Math.max(
            key.length,
            ...exportData.map((r) =>
              String(r[key] || "").length
            )
          ) + 5,
      })
    );

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Selected Cases"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(
      new Blob([excelBuffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `KNK_Selected_Cases_${new Date()
        .toISOString()
        .slice(0, 100)}.xlsx`
    );

    toast.success(
      `${selected.length} case(s) exported successfully.`
    );

  } catch (err) {
    console.error(err);

    toast.error(
      err.response?.data?.message ||
      "Failed to export selected cases."
    );
  }
};

const handleBulkStatusUpdate = async () => {
  try {
    await bulkUpdateStatus(selectedCases);

   toast.success(
  `${selectedCases.length} cases moved to In_Progress`
);

    setSelectedCases([]);

    fetchCases();
  } catch (err) {
    console.error(err);

    alert(
      err.response?.data?.message ||
      "Bulk update failed."
    );
  }
};
 

  return (
    <DashboardLayout
      title="All Cases"
      breadcrumbs={["Home","Cases"]}
    >

      <div className="space-y-4">

        <div>
          <h1 className="text-xl font-bold">
            All Cases
          </h1>

          <p className="text-sm text-slate-400">
            {total} total records
          </p>
        </div>


        {/* SEARCH */}

        <div className="bg-white rounded-xl border border-slate-100 p-4">

          <div className="flex gap-3">

            <div className="relative flex-1">

              <MdSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>

              <input
                value={search}

                onChange={(e)=>{

                  setSearch(
                    e.target.value
                  );

                  setPage(1);

                }}

                placeholder="Search name / application ID..."

                className="
                w-full
                pl-9
                pr-4
                py-2.5
                border
                rounded-lg
                text-sm
                focus:ring-2
                focus:!important ring-blue-500
                "
              />

            </div>


            <button

              onClick={handleClear}

              className="
              border
              px-4
              rounded-lg
              flex
              items-center
              gap-1
              "

            >

              <MdClear/>

              Clear

            </button>

          </div>

        </div>
        
        <div className="flex items-center gap-3 mt-4">

           <button
    onClick={() => navigate("/bulk-upload")}
    className="
      bg-emerald-100
      border border-emerald-300
      text-emerald-700
      px-5
      py-2.5
      rounded-lg
      font-medium
      hover:bg-emerald-200
      transition
    "
  >
    Bulk Upload
  </button>

  {selectedCount > 0 && (
    <>
      <button
        onClick={exportSelectedCases}
        className="
          bg-sky-100
          border border-sky-300
          text-sky-700
          px-5
          py-2.5
          rounded-lg
          font-medium
          hover:bg-sky-200
          transition
        "
      >
        Export Excel ({selectedCount})
      </button>

      <button
        onClick={handleBulkStatusUpdate}
        className="
          bg-amber-100
          border border-amber-300
          text-amber-700
          px-5
          py-2.5
          rounded-lg
          font-medium
          hover:bg-amber-200
          transition
        "
      >
        Mark as WIP ({selectedCount})
      </button>

      <button
        onClick={() => setSelectedCases([])}
        className="
          border
          px-5
          py-2.5
          rounded-lg
          hover:bg-slate-50
        "
      >
        Clear Selection
      </button>
    </>
  )}

</div>


        {/* TABLE */}

        <div className="bg-white rounded-xl border overflow-hidden">

          {loading ? (

            <LoadingSpinner/>

          ) : cases.length===0 ? (

            <EmptyState
              title="No cases found"
              message="Try adjusting search"
            />

          ) : (

           <div className="overflow-x-auto">

  <table className="w-full">

    <thead>
      <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-4 py-4 w-12">

          <input
            type="checkbox"
          checked={
              selectedCases.length > 0 &&
              selectedCases.length ===
                cases.filter((c) => c.check_status === "NEW").slice(0, 100).length
            }
            onChange={handleSelectAll}
            className="w-4 h-4 cursor-pointer"
          />

        </th>

        {[
          "APP ID",
          "CANDIDATE",
          "FATHER NAME",
          "DOB",
          "CITY",
          "STATE",
          "VENDOR",
          "STATUS",
          "ASSIGNED TO",
          "CREATED",
          "ACTION"
        ].map(h => (

          <th
            key={h}
            className="
            px-6
            py-4
            text-left
            text-xs
            font-semibold
            text-slate-500
            uppercase
            tracking-wide
            whitespace-nowrap
            "
          >
            {h}
          </th>

        ))}

      </tr>
    </thead>

    <tbody className="divide-y divide-slate-100">

      {cases.map(c => (

        <tr
  key={c._id}
  className="hover:bg-slate-50 transition-colors"
>

  {/* Checkbox */}
  <td className="w-12 px-4 py-5 text-center">
    <input
      type="checkbox"
      checked={selectedCases.includes(c.comp_ref_no)}
      onChange={() => toggleCaseSelection(c.comp_ref_no)}
      className="w-4 h-4 cursor-pointer"
      disabled={
        !selectedCases.includes(c.comp_ref_no) &&
        selectedCases.length >= 10
      }
    />
  </td>

  {/* APP ID */}
  <td className="px-6 py-5 text-sm font-mono text-slate-600">
    {c.comp_ref_no}
  </td>

          <td className="px-6 py-5 font-semibold text-slate-900">
            {c.candidate_name || "—"}
          </td>

          <td className="px-6 py-5 text-slate-500">
            {c.father_name || "—"}
          </td>

          <td className="px-6 py-5 text-slate-500">
            {c.candidate_dob
              ? new Date(
                  c.candidate_dob
                ).toLocaleDateString("en-GB")
              : "—"}
          </td>

          <td className="px-6 py-5 text-slate-500">
            {c.city || "—"}
          </td>

          <td className="px-6 py-5 text-slate-500">
            {c.state || "—"}
          </td>

          <td className="px-6 py-5 text-slate-500">
            {c.vendor || "—"}
          </td>

          <td className="px-6 py-5">
            <StatusBadge
              status={c.check_status}
            />
          </td>

          <td className="px-6 py-5">

            {c.assignedTo?.email
              ? c.assignedTo.email.split("@")[0]
              : (
                <span className="italic text-slate-300">
                  Unassigned
                </span>
              )}

          </td>

          <td className="px-6 py-5 text-slate-400 text-sm">
            {new Date(
              c.createdAt
            ).toLocaleDateString(
              "en-GB",
              {
                day:"2-digit",
                month:"short",
                year:"2-digit"
              }
            )}
          </td>

                <td className="px-6 py-5">

        <div className="flex gap-2">

          <button
            onClick={() =>
              navigate(`/cases/${c._id}`)
            }
            className="
            border border-blue-200
            text-blue-600
            px-4 py-2
            rounded-xl
            hover:bg-blue-50
            flex items-center gap-2
            text-sm
            "
          >
            <MdVisibility />
            View
          </button>

          {c.check_status === "COMPLETED" && (
          <button
            onClick={() => archiveCase(c._id)}
            className="
              bg-red-100
              text-red-700
              px-4 py-2
              rounded-xl
              text-sm
              hover:bg-red-200
            "
          >
            Archive
          </button>
        )}

        </div>

      </td>

        </tr>

      ))}

    </tbody>

  </table>

</div>

          )}


          {!loading && totalPages>1 && (

            <div className="flex justify-end gap-2 p-4">

              <button

              disabled={page===1}

              onClick={()=>
                setPage(p=>p-1)
              }>

                <MdChevronLeft/>

              </button>


              <span>

                {page}/{totalPages}

              </span>


              <button

              disabled={
                page===totalPages
              }

              onClick={()=>
                setPage(
                  p=>p+1
                )
              }>

                <MdChevronRight/>

              </button>

            </div>

          )}

        </div>

      </div>

    </DashboardLayout>
  );
}