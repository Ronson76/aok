import { Link } from "wouter";
import { Building2, User, Users, ChevronRight, ArrowLeft } from "lucide-react";

export default function OrgLoginSelect() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-back-login">
            <ArrowLeft className="h-5 w-5 text-emerald-400" />
          </Link>
          <Building2 className="h-7 w-7 text-emerald-400" />
          <span className="text-xl font-bold text-white">aok</span>
          <span className="text-xs text-emerald-300 border border-emerald-700 rounded-full px-2 py-0.5">Organisation</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 mb-2">
              <Building2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Organisation Portal</h1>
            <p className="text-slate-300/70">Choose how you'd like to sign in</p>
          </div>

          <div className="space-y-3">
            <Link href="/org/client-login">
              <button
                className="w-full group relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex items-center justify-between hover:bg-white/10 hover:border-emerald-400/40 transition-all duration-300 cursor-pointer"
                data-testid="button-client-login"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-emerald-500/20 p-3 group-hover:bg-emerald-500/30 transition-colors">
                    <User className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white text-lg">I'm a Client</div>
                    <div className="text-sm text-slate-300/60">Sign in using your email and reference code</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-400/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </button>
            </Link>

            <Link href="/org/staff-login">
              <button
                className="w-full group relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex items-center justify-between hover:bg-white/10 hover:border-teal-400/40 transition-all duration-300 cursor-pointer"
                data-testid="button-staff-login"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-teal-500/20 p-3 group-hover:bg-teal-500/30 transition-colors">
                    <Building2 className="h-6 w-6 text-teal-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white text-lg">I'm from an Organisation</div>
                    <div className="text-sm text-slate-300/60">Sign in to manage your organisation's clients</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-teal-400/50 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </button>
            </Link>

            <Link href="/org/team-login">
              <button
                className="w-full group relative overflow-hidden rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm p-5 flex items-center justify-between hover:bg-white/10 hover:border-cyan-400/40 transition-all duration-300 cursor-pointer"
                data-testid="button-team-login"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-cyan-500/20 p-3 group-hover:bg-cyan-500/30 transition-colors">
                    <Users className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-white text-lg">I'm a Team Member</div>
                    <div className="text-sm text-slate-300/60">Sign in to your organisation team account</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-cyan-400/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-4">
        <p className="text-center text-xs text-slate-400/30">&copy; {new Date().getFullYear()} aok by NaiyaTech</p>
      </footer>
    </div>
  );
}
