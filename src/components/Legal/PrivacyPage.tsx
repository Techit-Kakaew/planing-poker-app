import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
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
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Last updated: April 27, 2024
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Introduction
            </h2>
            <p>
              Welcome to Team-up (the "App"). We respect your privacy and are
              committed to protecting your personal data. This privacy policy
              will inform you as to how we look after your personal data when
              you visit our website or use the App and tell you about your
              privacy rights and how the law protects you.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. Data We Collect
            </h2>
            <p>
              When you use Team-up, we collect certain information to provide
              and improve the service:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Information:</strong> If you sign in via Google
                or Atlassian, we collect your name, email address, and profile
                picture.
              </li>
              <li>
                <strong>Usage Data:</strong> We store information about the
                rooms you create, the tasks you add, and the votes you cast
                during planning sessions.
              </li>
              <li>
                <strong>Atlassian Integration:</strong> If you connect to Jira,
                we may access issue details (title, description, status) to
                display them within the App. We do not modify your Jira data
                without your explicit action.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. How We Use Your Data
            </h2>
            <p>We use your data only for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain our Service.</li>
              <li>
                To allow you to participate in interactive features of our App
                (voting, room management).
              </li>
              <li>To provide customer support.</li>
              <li>To notify you about changes to our Service.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your data. However, please remember that no method of
              transmission over the internet or method of electronic storage is
              100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Third-Party Services
            </h2>
            <p>
              We use Supabase for authentication and database management. If you
              use the Jira integration, your data is shared with Atlassian
              according to their privacy policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at support@team-up.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
