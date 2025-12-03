export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
  )
}
