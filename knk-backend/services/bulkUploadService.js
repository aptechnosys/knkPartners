const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

/**
 * Read Excel File
 */
const readExcelFile = (excelPath) => {
  const workbook = XLSX.readFile(excelPath);

  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet);
};

/**
 * Validate uploaded Excel
 */
const validateExcelData = (excelData) => {
  if (!excelData.length) {
    throw new Error("Excel file is empty.");
  }

  // Maximum 50 rows
  if (excelData.length > 50) {
    throw new Error("Maximum 50 records allowed per upload.");
  }

  // Required Columns
  const requiredColumns = [
    "Reference No",
    "Verification Date",
    "Colour Code",
    "Verify Status",
    "File Name",
  ];

  const excelColumns = Object.keys(excelData[0]);

  const missingColumns = requiredColumns.filter(
    (column) => !excelColumns.includes(column)
  );

  if (missingColumns.length) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}`
    );
  }

  const validStatus = [
    "Completed",
    "Stop Check",
  ];

  excelData.forEach((row, index) => {
    const verifyStatus = String(
      row["Verify Status"] || ""
    ).trim();

    if (!row["Reference No"]) {
      throw new Error(
        `Row ${index + 2}: Reference No is required.`
      );
    }

    if (!row["File Name"]) {
      throw new Error(
        `Row ${index + 2}: File Name is required.`
      );
    }

    if (!verifyStatus) {
      throw new Error(
        `Row ${index + 2}: Verify Status is required.`
      );
    }

    if (!validStatus.includes(verifyStatus)) {
      throw new Error(
        `Row ${index + 2}: Invalid Verify Status.`
      );
    }
  });

  return true;
};

/**
 * Extract ZIP into uploads/proofs
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

  zip.extractAllTo(extractPath, true);

  return extractPath;
};

/**
 * Convert Excel Serial Date to JavaScript Date
 */
const excelDateToJSDate = (serial) => {
  if (!serial) return null;

  // Already a JS Date
  if (serial instanceof Date) {
    return serial;
  }

  // Excel Serial Number
  if (typeof serial === "number") {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
  }

  // String Date
  return new Date(serial);
};

module.exports = {
  readExcelFile,
  validateExcelData,
  extractZip,
  excelDateToJSDate,
};