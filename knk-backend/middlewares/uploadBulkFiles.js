const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");

const uploadPath = path.join(__dirname, "../uploads/bulk");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadPath);
  },

  filename(req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

module.exports = multer({
  storage,
}).fields([
  {
    name: "excel",
    maxCount: 1,
  },
  {
    name: "zip",
    maxCount: 1,
  },
]);