import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <div className="admin-page min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Forbidden Card */}
        <div className="admin-panel overflow-hidden">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#991b1b] via-[#7f1d1d] to-[#450a0a] p-10 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(254,202,202,0.15),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(127,29,29,0.3),transparent_35%)]" />
            <div className="relative z-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-4xl backdrop-blur border border-white/15">
                
              </div>
              <h1 className="heading-display mt-5 text-3xl text-white">Access Forbidden</h1>
              <p className="mt-3 text-sm text-white/60 max-w-xs mx-auto">
                Your account does not have sufficient permissions to access this admin section.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="admin-banner admin-banner-warning">
              <span className="admin-banner-icon"></span>
              <div>
                <p className="font-semibold">Permission Required</p>
                <p className="text-sm mt-1">
                  Contact an owner to upgrade your role if you need access to this module.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/" className="admin-btn admin-btn-ghost w-full sm:w-auto">
                 Go to Homepage
              </Link>
              <Link href="/admin" className="admin-btn admin-btn-primary w-full sm:w-auto">
                 Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-6">
          <p className="text-xs text-[var(--admin-text-dim)]">
            All access attempts are logged for security purposes.
          </p>
        </div>
      </div>
    </div>
  );
}

