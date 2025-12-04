import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { User, Lock, Shield, Eye, EyeOff, Check, AlertTriangle } from "lucide-react"

export function ProfilePage() {
  const profile = useQuery(api.users.getCurrentUserProfile)
  const changePassword = useMutation(api.users.changePassword)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password")
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setSuccess("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Profile & Security</h1>
        <p className="text-dark-400 mt-1">Manage your account settings and security preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-dark-50">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Full Name</label>
              <p className="text-dark-200 font-medium">{profile.firstName} {profile.lastName}</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Email Address</label>
              <p className="text-dark-200">{profile.email}</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Role</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 capitalize">
                {profile.role}
              </span>
            </div>
            {profile.branchName && (
              <div>
                <label className="block text-xs text-dark-400 mb-1">Assigned Branch</label>
                <p className="text-dark-200">{profile.branchName} ({profile.branchCode})</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-dark-50">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/30 border border-green-700 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <Check className="h-4 w-4" />
                {success}
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="label">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-300"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="label">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Enter new password (min 6 characters)"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-300"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-400 hover:text-dark-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Changing Password...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
