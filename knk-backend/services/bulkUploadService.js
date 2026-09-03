const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

/**
 * ============================================================
 * READ EXCEL FILE
 * ============================================================
 */
const readExcelFile = (excelPath) => {
  const workbook = XLSX.readFile(excelPath);

  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet);
};


/**
 * ============================================================
 * VALIDATE EXCEL FILE STRUCTURE
 *
 * IMPORTANT:
 * This function validates ONLY the Excel structure.
 *
 * It does NOT stop the upload because of a bad individual row.
 * Row-level validation is handled inside bulkUploadCases().
 * ============================================================
 */
const validateExcelData = (excelData) => {
  if (!Array.isArray(excelData) || !excelData.length) {
    throw new Error("Excel file is empty.");
  }

  // Maximum 100 rows
  if (excelData.length > 100) {
    throw new Error(
      "Maximum 100 records allowed per upload."
    );
  }

  // Required columns
  const requiredColumns = [
    "Reference No",
    "Verification Date",
    "Colour Code",
    "Verify Status",
    "File Name",
  ];

  const excelColumns = Object.keys(
    excelData[0] || {}
  );

  const missingColumns = requiredColumns.filter(
    (column) =>
      !excelColumns.includes(column)
  );

  if (missingColumns.length) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(
        ", "
      )}`
    );
  }

  return true;
};


/**
 * ============================================================
 * VALIDATE SINGLE EXCEL ROW
 *
 * Returns an array of structured errors.
 *
 * IMPORTANT:
 * A bad row does NOT stop the entire upload.
 * ============================================================
 */
const validateExcelRow = (row, index) => {
  const errors = [];

  const rowNumber = index + 2;

  const referenceNo = String(
    row["Reference No"] || ""
  ).trim();

  const fileName = String(
    row["File Name"] || ""
  ).trim();

  const verifyStatus = String(
    row["Verify Status"] || ""
  ).trim();

  // ------------------------------------------------------------
  // Reference No
  // ------------------------------------------------------------

  if (!referenceNo) {
    errors.push({
      row: rowNumber,
      applicationId: "",
      type: "MISSING_REFERENCE",
      reason: "Reference No is required.",
      fileName,
    });
  }

  // ------------------------------------------------------------
  // File Name
  // ------------------------------------------------------------

  if (!fileName) {
    errors.push({
      row: rowNumber,
      applicationId: referenceNo,
      type: "MISSING_PROOF",
      reason: "File Name is required.",
      fileName: "",
    });
  }

  // ------------------------------------------------------------
  // Verify Status
  // ------------------------------------------------------------

  if (!verifyStatus) {
    errors.push({
      row: rowNumber,
      applicationId: referenceNo,
      type: "MISSING_STATUS",
      reason: "Verify Status is required.",
      fileName,
    });
  } else if (
    !["Completed", "Stop Check"].includes(
      verifyStatus
    )
  ) {
    errors.push({
      row: rowNumber,
      applicationId: referenceNo,
      type: "INVALID_STATUS",
      reason:
        `Invalid Verify Status "${verifyStatus}". ` +
        `Allowed values are Completed or Stop Check.`,
      fileName,
    });
  }

  return errors;
};


/**
 * ============================================================
 * EXTRACT ZIP
 * ============================================================
 */
const extractZip = (zipPath) => {
  const extractPath = path.join(
    __dirname,
    "../uploads/proofs"
  );

  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, {
      recursive: true,
    });
  }

  const zip = new AdmZip(zipPath);

  zip.extractAllTo(
    extractPath,
    true
  );

  return extractPath;
};


/**
 * ============================================================
 * CONVERT EXCEL SERIAL DATE TO JS DATE
 * ============================================================
 */
const excelDateToJSDate = (serial) => {
  if (!serial) return null;

  // Already a JS Date
  if (serial instanceof Date) {
    return serial;
  }

  // Excel serial number
  if (typeof serial === "number") {
    const utcDays =
      Math.floor(serial - 25569);

    const utcValue =
      utcDays * 86400;

    return new Date(
      utcValue * 1000
    );
  }

  // String date
  return new Date(serial);
};


module.exports = {
  readExcelFile,
  validateExcelData,
  validateExcelRow,
  extractZip,
  excelDateToJSDate,
};