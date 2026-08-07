const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    comp_ref_no: {
      type: String,
      required: [true, "Complaint reference number is required"],
      unique: true,
      trim: true,
      match: [
      /^REF-[A-Za-z0-9-]+$/,
      "Invalid format. Use REF-001 or REF-2026-001111"
    ]
    },

    candidate_name: String,
    father_name: String,
    candidate_dob: Date,
    street_address: String,
    city: String,
    state: String,
    pincode: String,
    vendor: String,
    tat: {
      type: Number,
      default: 5,
    },
    attachment: String,
    remark: String,
    callback_url: String,

      insufficient_query: {
        type: String,
        default: "",
      },

    check_status: {
      type: String,
      enum: [
        "NEW",
        "IN_PROGRESS",
        "Q_CHECK",
        "DONE",
        "INSUFFICIENT",
        "ON_HOLD",
        "STOPPED",
        "REJECTED"
      ],
      default: "NEW"
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    
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

verification_remark: {
  type: String,
  default: "",
},

verified_by: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
},

verified_date: {
  type: Date,
},

proof_document: {
  type: String,
  default: "",
},

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
    timestamps: true
  }

  
);



module.exports = mongoose.models.Case || mongoose.model("Case", caseSchema);