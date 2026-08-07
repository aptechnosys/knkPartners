import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import API from "../api/axios";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_API_URL.replace("/api/v1", "");

function Profile() {
  const [editMode, setEditMode] = useState(false);
  const { user, login } = useAuth();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    createdAt: "",
    avatar: "",
    lastLogin: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/auth/profile");

      setProfile({
        name: res.data.name || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
        role: res.data.role || "",
        createdAt: res.data.createdAt || "",
        avatar: res.data.avatar || "",
        lastLogin: res.data.lastLogin || "",
      });
    } catch (error) {
      console.error(error);
    }
  };

 // Handle avatar upload
 // handle avatar upload
const handleAvatarUpload = async (e) => {
  try {
    const file = e.target.files[0];

    if (!file) return;

    // File type validation
    if (!file.type.startsWith("image/")) {
      return toast.error(
        "Please select a valid image file"
      );
    }

    // File size validation (2 MB)
    if (file.size > 2 * 1024 * 1024) {
      return toast.error(
        "Image size should be less than 2 MB"
      );
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const res = await API.patch(
      "/auth/avatar",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );

    // Update Profile Page Avatar
    setProfile((prev) => ({
      ...prev,
      avatar: res.data.avatar,
    }));

    // Update AuthContext + localStorage
    const updatedUser = {
      ...user,
      avatar: res.data.avatar,
    };

    login(
      localStorage.getItem("token"),
      updatedUser
    );

    toast.success(
      "Avatar uploaded successfully"
    );

  } catch (error) {
    console.error(error);

    toast.error(
      error.response?.data?.message ||
      "Failed to upload avatar"
    );
  }
};

 const handleProfileSave = async () => {
  try {
    const res = await API.put("/auth/profile", {
      name: profile.name,
      phone: profile.phone,
    });

    // Update AuthContext + localStorage instantly
    const updatedUser = {
        ...user,
        name: profile.name,
        phone: profile.phone,
        avatar: profile.avatar,
      };

    login(
      localStorage.getItem("token"),
      updatedUser
    );

    toast.success("Profile updated successfully");

    setEditMode(false);

    fetchProfile();
  } catch (error) {
    console.log("FULL ERROR =>", error);
    console.log("RESPONSE =>", error.response);
    console.log("DATA =>", error.response?.data);

    toast.error(
      error.response?.data?.message ||
      "Failed to update profile"
    );
  }
};

  const handlePasswordChange = async () => {
    try {
      if (
        passwordData.newPassword !==
        passwordData.confirmPassword
      ) {
        return toast.error("New Password and Confirm Password do not match");
      }

      await API.patch("/auth/change-password", {
        currentPassword:
          passwordData.currentPassword,
        newPassword:
          passwordData.newPassword,
      });

      toast.success("Password changed successfully");

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to change password"
      );
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="font-semibold text-lg text-slate-700">
              My Details
            </h2>

            <button
              onClick={() => setEditMode(!editMode)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {editMode ? "Cancel" : "Modify"}
            </button>
          </div>

          <div className="p-6 space-y-5">

            <div className="flex flex-col items-center mb-6">
         
         {/* //for avatar upload */}
            <img
                src={
                  profile.avatar
                    ? `${SERVER_URL}${profile.avatar}`
                    : "/default-avatar.png"
                }
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border"
              />

              <label className="mt-3 cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                Upload Avatar

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>

            </div>

            <div>
              <label className="text-sm text-slate-500">
                Name
              </label>

              <input
                disabled={!editMode}
                value={profile.name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    name: e.target.value,
                  })
                }
                className="w-full mt-1 border rounded-lg p-3 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Email
              </label>

              <input
                disabled
                value={profile.email}
                className="w-full mt-1 border rounded-lg p-3 bg-slate-100"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Phone Number
              </label>

              <input
                disabled={!editMode}
                value={profile.phone}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    phone: e.target.value,
                  })
                }
                className="w-full mt-1 border rounded-lg p-3 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Role
              </label>

              <input
                disabled
                value={profile.role}
                className="w-full mt-1 border rounded-lg p-3 bg-slate-100"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Active Since
              </label>

              <input
                disabled
                value={
                  profile.createdAt
                    ? new Date(
                        profile.createdAt
                      ).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )
                    : ""
                }
                className="w-full mt-1 border rounded-lg p-3 bg-slate-100"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Last Login
              </label>

              <input
                disabled
                value={
                  profile.lastLogin
                    ? new Date(
                        profile.lastLogin
                      ).toLocaleString("en-GB")
                    : "Never"
                }
                className="w-full mt-1 border rounded-lg p-3 bg-slate-100"
              />
            </div>

            {editMode && (
              <button
                onClick={handleProfileSave}
                className="bg-green-600 text-white px-5 py-2 rounded-lg"
              >
                Save Changes
              </button>
            )}

          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-lg text-slate-700">
              Change Password
            </h2>
          </div>

          <div className="p-6 space-y-5">

            <div>
              <label className="text-sm text-slate-500">
                Current Password
              </label>

              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full mt-1 border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                New Password
              </label>

              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="w-full mt-1 border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">
                Confirm Password
              </label>

              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full mt-1 border rounded-lg p-3"
              />
            </div>

            <button
              onClick={handlePasswordChange}
              className="bg-green-600 text-white px-5 py-2 rounded-lg"
            >
              Save
            </button>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

export default Profile;