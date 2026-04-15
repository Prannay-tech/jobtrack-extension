import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — JobTrack",
  description: "JobTrack privacy policy. Learn how we handle your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: April 2026</p>

        <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-10">
          <span className="text-sm font-semibold text-green-700">✅ We do not sell or share your data</span>
        </div>

        <Section title="What JobTrack Does">
          <p>
            JobTrack is a Chrome extension and web dashboard that helps you log job applications
            with a keyboard shortcut. It saves application data to your personal dashboard
            powered by Supabase and optionally analyzes job descriptions using AI.
          </p>
        </Section>

        <Section title="Data We Collect">
          <p>JobTrack collects the following data when you log a job application:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Job title, company name, and job URL (scraped from the current page)</li>
            <li>Application date and status</li>
            <li>Notes you optionally add</li>
            <li>AI-generated role brief, years of experience estimate, and top skills (derived from the job description text)</li>
            <li>Your email address (for account authentication)</li>
          </ul>
        </Section>

        <Section title="Where Your Data Goes">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Your Supabase dashboard:</strong> All application data is stored in a secure
              Supabase database, accessible only to your authenticated account via Row Level Security.
            </li>
            <li>
              <strong>Your device:</strong> Application data is cached locally in{" "}
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">chrome.storage.local</code>{" "}
              to power the extension popup. This data never leaves your device except to sync with your dashboard.
            </li>
            <li>
              <strong>AI analysis proxy:</strong> Job description text is sent to our Cloudflare Worker
              proxy, which forwards it to Groq&apos;s API to generate a role brief, YOE estimate, and skills.
              No personally identifiable information is included. The text is not stored by our proxy.
            </li>
          </ul>
        </Section>

        <Section title="Authentication">
          <p>
            JobTrack uses Supabase Auth for authentication. You can sign in with email/password
            or Google OAuth. Your password is never stored by JobTrack — it is handled entirely
            by Supabase&apos;s authentication system.
          </p>
        </Section>

        <Section title="Chrome Extension Permissions">
          <p>The JobTrack extension requests the following permissions:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">activeTab</code> — to access the current tab when you trigger the shortcut</li>
            <li><code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">scripting</code> — to inject the content script for job data extraction</li>
            <li><code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">storage</code> — to cache application data locally for the popup</li>
            <li><code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">notifications</code> — to show confirmation after logging</li>
            <li><code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">alarms</code> — to check for stale applications daily</li>
          </ul>
          <p className="mt-3">
            The content script runs on all URLs so it can extract job details from any job board.
            It only activates when you press the keyboard shortcut or open the extension popup.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            Local storage can be cleared at any time by removing the extension. Data in your
            Supabase dashboard can be deleted from the dashboard at any time. You can also
            export all your data as CSV before deleting your account.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> — database and authentication. See{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Supabase&apos;s Privacy Policy
              </a>
            </li>
            <li>
              <strong>Groq API</strong> — job description analysis. See{" "}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Groq&apos;s Privacy Policy
              </a>
            </li>
            <li>
              <strong>Cloudflare Workers</strong> — AI proxy layer. See{" "}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Cloudflare&apos;s Privacy Policy
              </a>
            </li>
          </ul>
        </Section>

        <Section title="Children's Privacy">
          <p>
            JobTrack is not directed at children under 13 and does not knowingly collect data from children.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy as the product evolves. Continued use of JobTrack constitutes
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Open an issue on the{" "}
            <a href="https://github.com/Prannay-tech/jobtrack-extension" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              GitHub repository
            </a>{" "}
            or email via GitHub.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
