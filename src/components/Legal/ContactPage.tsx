import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageSquare, ExternalLink } from "lucide-react";

export default function ContactPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-indigo-600 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Contact Support
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Need help? We're here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Email Support
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                For general inquiries and technical support.
              </p>
              <a
                href="mailto:support@team-up.app"
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 font-bold mt-4 hover:underline"
              >
                support@team-up.app
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                GitHub Issues
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Report bugs or request new features.
              </p>
              <a
                href="https://github.com/Techit-Kakaew/planing-poker-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold mt-4 hover:underline"
              >
                Open Issue
                <ExternalLink className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>

        <div className="p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <strong>Typical Response Time:</strong> We usually respond to all
            inquiries within 24-48 business hours. Thank you for your patience!
          </p>
        </div>
      </div>
    </div>
  );
}
