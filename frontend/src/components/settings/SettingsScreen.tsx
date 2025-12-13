import { useState, useEffect } from "react";
import {
  User as UserIcon,
  Users,
  Bell,
  Palette,
  Type,
  Copy,
  Check,
} from "lucide-react";
import { User } from "../../App";
import { MascotIllustration } from "../mascots/MascotIllustration";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";

interface SettingsScreenProps {
  currentUser: User;
  household: string;
  inviteCode?: string | null;
  onUpdateUser?: (user: User) => void;
  householdMembers?: {
    id?: string;
    name: string;
    mascot?: string | null;
    color?: string | null;
    pronouns?: string | null;
  }[];
}

export function SettingsScreen({
  currentUser,
  household,
  inviteCode,
  onUpdateUser,
  householdMembers,
}: SettingsScreenProps) {
  // TODO: Replace with real notification settings fetching from backend and using notification API
  const [notifications, setNotifications] = useState({
    dailyReminders: true,
    weeklySummary: true,
    motivationalMessages: true,
    roommateUpdates: false,
  });
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState(currentUser.email || "");
  const [nameInput, setNameInput] = useState(currentUser.name || "");
  const [pronounsInput, setPronounsInput] = useState(
    currentUser.pronouns || ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  // track which fields are currently updating to disable buttons
  const [updatingFields, setUpdatingFields] = useState<Record<string, boolean>>(
    {}
  );

  // sync controlled inputs when currentUser changes
  useEffect(() => {
    setEmailInput(currentUser.email || "");
    setNameInput(currentUser.name || "");
    setPronounsInput(currentUser.pronouns || "");
  }, [currentUser.email, currentUser.name, currentUser.pronouns]);

  // Generic updater: validates password/email and sends PUT to backend
  const updateUserField = async (field: string, data: any) => {
    if (updatingFields[field]) return;

    // basic validation
    if (field === "password") {
      if (!data || String(data).length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
      }
      setPasswordError(null);
      setSavingPassword(true);
    }
    if (field === "email") {
      if (!data) {
        setEmailError("Email cannot be empty");
        return;
      }
      const emailStr = String(data).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        setEmailError("Please enter a valid email address");
        return;
      }
      setEmailError(null);
      setSavingEmail(true);
      data = emailStr;
    }

    // TODO: Include updateing mascot and color logic
    setUpdatingFields((p) => ({ ...p, [field]: true }));
    try {
      const resp = await fetch(`http://localhost:3000/api/user/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: String(currentUser.id), [field]: data }),
      });

      const text = await resp.text();
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }

      if (!resp.ok) {
        throw new Error(body?.error || "Failed to update user");
      }

      if (body?.user && typeof onUpdateUser === "function") {
        onUpdateUser(body.user);
      }

      // update local controlled inputs after successful save
      switch (field) {
        case "name":
          setNameInput(String(data || ""));
          break;
        case "pronouns":
          setPronounsInput(String(data || ""));
          break;
        case "email":
          setEmailInput(String(data || ""));
          break;
        case "password":
          setNewPassword("");
          break;
        default:
          break;
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to update";
      if (field === "email") setEmailError(msg);
      else if (field === "password") setPasswordError(msg);
      else console.warn("Update failed:", msg);
    } finally {
      setUpdatingFields((p) => {
        const copy = { ...p };
        delete copy[field];
        return copy;
      });
      if (field === "email") setSavingEmail(false);
      if (field === "password") setSavingPassword(false);
    }
  };

  const handleNotificationToggle = (data: string, next: boolean) => {};

  // TODO: Implement change Mascot Color logic in backend
  const changeMascot = (newColor: string) => {};

  const changeMascotColors = (color: string) => {};

  // TODO: Implement support contact functionality
  const handleSupportClick = () => {};

  // Use the real invite code passed from the app (Header uses the same source)
  const resolvedInviteCode = inviteCode || "Unavailable";

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // TODO: Implement accessibility changes to UI
  const [accessibility, setAccessibility] = useState({
    largerText: false,
    highContrast: false,
  });

  const handleAccessibility = (
    key: keyof typeof accessibility,
    value: boolean
  ) => {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-purple-700 mb-2">Settings & Profile</h2>
        <p className="text-purple-500">
          Manage your profile, household, and preferences ⚙️
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <UserIcon className="w-5 h-5 text-purple-500" />
              <h3 className="text-purple-700">Your Profile</h3>
            </div>

            <div className="flex items-start gap-8">
              <div className="text-center">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-3xl shadow-lg mb-4">
                  <MascotIllustration
                    mascot={currentUser.mascot}
                    color={currentUser.color}
                    size={120}
                    showSparkle
                  />
                </div>
                <Button
                  onClick={() => changeMascot(currentUser.mascot)}
                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-2xl text-sm"
                >
                  Change Mascot
                </Button>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-purple-600 text-sm mb-2 block">
                    Name
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-white/80 border-purple-200 rounded-2xl"
                    />
                    <Button
                      onClick={() => updateUserField("name", nameInput)}
                      disabled={!!updatingFields["name"]}
                      className="bg-white border border-purple-200 text-purple-700 rounded-2xl"
                    >
                      {updatingFields["name"] ? "Saving..." : "Update"}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-purple-600 text-sm mb-2 block">
                    Pronouns
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="She/Her"
                      value={pronounsInput}
                      onChange={(e) => setPronounsInput(e.target.value)}
                      className="bg-white/80 border-purple-200 rounded-2xl"
                    />
                    <Button
                      onClick={() =>
                        updateUserField("pronouns", pronounsInput || null)
                      }
                      disabled={!!updatingFields["pronouns"]}
                      className="bg-white border border-purple-200 text-purple-700 rounded-2xl"
                    >
                      {updatingFields["pronouns"] ? "Saving..." : "Update"}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-purple-600 text-sm mb-2 block">
                    Email
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="bg-white/80 border-purple-200 rounded-2xl"
                    />
                    <Button
                      onClick={() => updateUserField("email", emailInput)}
                      disabled={!!updatingFields["email"] || savingEmail}
                      className="bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-2xl"
                    >
                      {updatingFields["email"] || savingEmail
                        ? "Saving..."
                        : "Save"}
                    </Button>
                  </div>
                  {emailError ? (
                    <p className="text-sm text-red-600 mt-1">{emailError}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-purple-600 text-sm mb-2 block">
                    Change Password
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      type="password"
                      className="bg-white/80 border-purple-200 rounded-2xl"
                    />
                    <Button
                      onClick={() => updateUserField("password", newPassword)}
                      disabled={!!updatingFields["password"] || savingPassword}
                      className="bg-white border border-purple-200 text-purple-700 rounded-2xl"
                    >
                      {updatingFields["password"] || savingPassword
                        ? "Saving..."
                        : "Update"}
                    </Button>
                  </div>
                  {passwordError ? (
                    <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-purple-600 text-sm mb-2 block">
                    Mascot Color
                  </label>
                  <div className="flex gap-2">
                    {[
                      "#FFB6C1",
                      "#B4E7CE",
                      "#A7C7E7",
                      "#E6B8FF",
                      "#FFE4B5",
                      "#FFDAB9",
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => changeMascotColors(color)}
                        className={`w-10 h-10 rounded-full border-4 transition-all ${
                          currentUser.color === color
                            ? "border-purple-500 shadow-lg scale-110"
                            : "border-white hover:border-purple-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          {/* TODO: Make buttons that change notifcaiton */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-purple-500" />
              <h3 className="text-purple-700">Notifications</h3>
            </div>

            <div className="space-y-4">
              {/* Daily Reminders */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div>
                  <p className="text-purple-700">Daily Reminders</p>
                  <p className="text-purple-500 text-sm">
                    Get notified about today's chores
                  </p>
                </div>
                <Button
                  aria-pressed={notifications.dailyReminders}
                  onClick={() => {
                    const next = !notifications.dailyReminders;
                    setNotifications({
                      ...notifications,
                      dailyReminders: next,
                    });
                    handleNotificationToggle("dailyReminders", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    notifications.dailyReminders
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {notifications.dailyReminders ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {notifications.dailyReminders ? "On" : "Off"}
                </Button>
              </div>

              {/* Weekly Summary */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div>
                  <p className="text-purple-700">Weekly Summary</p>
                  <p className="text-purple-500 text-sm">
                    Receive a recap every Sunday
                  </p>
                </div>
                <Button
                  aria-pressed={notifications.weeklySummary}
                  onClick={() => {
                    const next = !notifications.weeklySummary;
                    setNotifications({ ...notifications, weeklySummary: next });
                    handleNotificationToggle("weeklySummary", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    notifications.weeklySummary
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {notifications.weeklySummary ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {notifications.weeklySummary ? "On" : "Off"}
                </Button>
              </div>

              {/* Motivational Messages */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div>
                  <p className="text-purple-700">Motivational Messages</p>
                  <p className="text-purple-500 text-sm">
                    Encouraging notes to keep you going!
                  </p>
                </div>
                <Button
                  aria-pressed={notifications.motivationalMessages}
                  onClick={() => {
                    const next = !notifications.motivationalMessages;
                    setNotifications({
                      ...notifications,
                      motivationalMessages: next,
                    });
                    handleNotificationToggle("motivationalMessages", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    notifications.motivationalMessages
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {notifications.motivationalMessages ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {notifications.motivationalMessages ? "On" : "Off"}
                </Button>
              </div>

              {/* Roommate Updates */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div>
                  <p className="text-purple-700">Roommate Updates</p>
                  <p className="text-purple-500 text-sm">
                    Know when others complete chores
                  </p>
                </div>
                <Button
                  aria-pressed={notifications.roommateUpdates}
                  onClick={() => {
                    const next = !notifications.roommateUpdates;
                    setNotifications({
                      ...notifications,
                      roommateUpdates: next,
                    });
                    handleNotificationToggle("roommateUpdates", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    notifications.roommateUpdates
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {notifications.roommateUpdates ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {notifications.roommateUpdates ? "On" : "Off"}
                </Button>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 border border-purple-100/50 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="w-5 h-5 text-purple-500" />
              <h3 className="text-purple-700">Accessibility</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                  <Type className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-purple-700">Larger Text</p>
                    <p className="text-purple-500 text-sm">
                      Increase readability
                    </p>
                  </div>
                </div>
                <Button
                  aria-pressed={accessibility.largerText}
                  onClick={() => {
                    const next = !accessibility.largerText;
                    setAccessibility({ ...accessibility, largerText: next });
                    handleAccessibility("largerText", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    accessibility.largerText
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {accessibility.largerText ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {accessibility.largerText ? "On" : "Off"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-purple-700">High Contrast Mode</p>
                    <p className="text-purple-500 text-sm">Better visibility</p>
                  </div>
                </div>
                <Button
                  aria-pressed={accessibility.highContrast}
                  onClick={() => {
                    const next = !accessibility.highContrast;
                    setAccessibility({ ...accessibility, highContrast: next });
                    handleAccessibility("highContrast", next);
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    accessibility.highContrast
                      ? "bg-purple-500 text-white"
                      : "bg-white/60 text-purple-700 border border-purple-100"
                  }`}
                >
                  {accessibility.highContrast ? (
                    <Check className="w-4 h-4 inline mr-1" />
                  ) : null}
                  {accessibility.highContrast ? "On" : "Off"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Household Section */}
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-purple-100/50 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-purple-500" />
              <h3 className="text-purple-700">Household</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4 border border-purple-200">
                <p className="text-purple-600 text-sm mb-1">Household Name</p>
                <p className="text-purple-700 text-lg">{household}</p>
              </div>

              <div>
                <p className="text-purple-600 text-sm mb-3">Roommates</p>
                <div className="space-y-2">
                  {(householdMembers ?? []).map((member, idx) => (
                    <div
                      key={member.id ?? idx}
                      className="bg-white/60 rounded-xl p-3 border border-purple-100 flex items-center gap-3"
                    >
                      <MascotIllustration
                        mascot={(member as any).mascot}
                        color={(member as any).color}
                        size={35}
                      />
                      <div>
                        <p className="text-purple-700 text-sm">
                          {member.name}
                        </p>
                        <p className="text-purple-500 text-xs">
                          {member.pronouns}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-purple-100">
                <p className="text-purple-600 text-sm mb-2">Invite Code</p>
                <div className="flex gap-2">
                  <Input
                    value={resolvedInviteCode}
                    readOnly
                    className="bg-purple-50 border-purple-200 rounded-xl text-center tracking-widest"
                  />
                  <Button
                    onClick={handleCopyCode}
                    className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl px-4"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-purple-400 text-xs mt-2">
                  Share this code with new roommates!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-6 border border-blue-200">
            <p className="text-purple-700 mb-2">💜 Need Help?</p>
            <p className="text-purple-600 text-sm mb-4">
              We're here to make your chore life easier!
            </p>
            <Button
              className="w-full bg-white hover:bg-purple-50 text-purple-600 rounded-xl"
              onClick={handleSupportClick}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
