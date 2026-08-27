const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    // ============================================================
    // APPLICATION / CASE REFERENCE NUMBER
    // Allows:
    // PL-108
    // 190657
    // ABC123
    // ABC_123
    // PL_2026-001
    //
    // Duplicate application IDs are allowed because the same
    // application can have multiple address/check records.
    // ============================================================
    comp_ref_no: {
      type: String,
      required: [true, "Complaint reference number is required"],
      trim: true,
      match: [
        /^[A-Za-z0-9_-]+$/,
        "Application ID can contain only letters, numbers, hyphens (-), and underscores (_)",
      ],
    },

    // ============================================================
    // CANDIDATE DETAILS
    // ============================================================
    candidate_name: {
      type: String,
      default: "",
      trim: true,
    },

    father_name: {
      type: String,
      default: "",
      trim: true,
    },

    candidate_dob: {
      type: Date,
    },

    // ============================================================
    // CANDIDATE ADDRESS
    // ============================================================
    address: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    pincode: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // VENDOR
    // ============================================================
    vendor: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // TAT
    // ============================================================
    tat: {
      type: Number,
      default: 5,
    },

    // ============================================================
    // ATTACHMENT
    // ============================================================
    attachment: {
      type: String,
      default: "",
    },

    // ============================================================
    // REMARK
    // ============================================================
    remark: {
      type: String,
      default: "",
    },

    callback_url: {
      type: String,
      default: "",
    },

    // ============================================================
    // INSUFFICIENT QUERY
    // ============================================================
    insufficient_query: {
      type: String,
      default: "",
    },

    // ============================================================
    // CASE STATUS
    // ============================================================
    check_status: {
      type: String,
      enum: [
        "NEW",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      default: "NEW",
    },

    // ============================================================
    // CASE CREATED BY USER
    // ============================================================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ============================================================
    // ASSIGNED AGENT
    // ============================================================
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ============================================================
    // VERIFICATION RESULT
    // ============================================================
    verification_result: {
      type: String,
      enum: [
        "GREEN",
        "RED",
        "ORANGE",
        "INSUFFICIENT",
      ],
      default: null,
    },

    // ============================================================
    // VERIFICATION REMARK
    // ============================================================
    verification_remark: {
      type: String,
      default: "",
    },

    // ============================================================
    // VERIFIED BY
    // ============================================================
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ============================================================
    // VERIFIED DATE
    // ============================================================
    verified_date: {
      type: Date,
    },

    // ============================================================
    // LEGACY / SINGLE PROOF
    //
    // Keeping this for backward compatibility with existing
    // records/code.
    // New multiple-proof functionality should use proofs[].
    // ============================================================
    proof_document: {
      type: String,
      default: "",
    },

    // ============================================================
    // MULTIPLE PROOF DOCUMENTS
    // ============================================================
    proofs: [
      {
        documentType: {
          type: String,
          trim: true,
          default: "",
        },

        originalName: {
          type: String,
          trim: true,
          default: "",
        },

        filePath: {
          type: String,
          required: true,
        },

        mimeType: {
          type: String,
          default: "",
        },

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================================
    // ARCHIVE
    // ============================================================
    isArchived: {
      type: Boolean,
      default: false,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    archivedBy: {
      type: String,
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

// ============================================================
// MODEL
// ============================================================
module.exports =
  mongoose.models.Case ||
  mongoose.model("Case", caseSchema);