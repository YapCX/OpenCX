import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { User, Lock, Info } from "lucide-react"

export function ProfilePage() {
  const profile = useQuery(api.users.getCurrentUserProfile)

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
            <h2 className="text-lg font-semibold text-dark-50">Password & Security</h2>
          </div>

          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary-400 mt-0.5" />
            <div>
              <p className="text-dark-200 text-sm">
                Password change functionality is managed through your authentication provider.
              </p>
              <p className="text-dark-400 text-sm mt-2">
                Contact your administrator if you need to reset your password.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Account Status</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                Active
              </span>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Account Created</label>
              <p className="text-dark-200 text-sm">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
