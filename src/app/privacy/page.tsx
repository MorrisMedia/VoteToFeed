import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | VoteToFeed",
  description: "Privacy Policy for VoteToFeed.com",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-surface-400">
              <li><Link href="/" className="hover:text-surface-600 transition-colors">Home</Link></li>
              <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></li>
              <li className="text-surface-700 font-medium">Privacy Policy</li>
            </ol>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">Privacy Policy</h1>
          <p className="mt-3 text-surface-500 text-sm">Last updated: March 9, 2026</p>
        </div>

        <div className="prose prose-surface max-w-none text-surface-700 space-y-6 text-[15px] leading-relaxed">
          <p><strong>HomeLife Brands</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates VoteToFeed.com (&ldquo;the Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">1. Information We Collect</h2>

          <h3 className="text-lg font-semibold text-surface-800 mt-4">Information You Provide</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Name, email address, and password when you register</li>
            <li><strong>Profile Information:</strong> Pet photos, pet names, breed information, and biographical details you choose to share</li>
            <li><strong>User Content:</strong> Comments, votes, and other interactions on the platform</li>
            <li><strong>Payment Information:</strong> When you purchase votes, payment is processed by Stripe. We do not store your full credit card number, CVV, or billing address. We receive a transaction confirmation and last four digits of your card.</li>
            <li><strong>Communications:</strong> Messages you send to us via email or support channels</li>
          </ul>

          <h3 className="text-lg font-semibold text-surface-800 mt-4">Information from Third-Party Authentication</h3>
          <p>If you sign in using Google or Facebook OAuth:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Google:</strong> We receive your name, email address, and profile photo from your Google account</li>
            <li><strong>Facebook:</strong> We receive your name, email address, and profile photo from your Facebook account</li>
          </ul>
          <p>We use this information only to create and maintain your VoteToFeed account. We do not access your contacts, post on your behalf, or access any other data from these services.</p>

          <h3 className="text-lg font-semibold text-surface-800 mt-4">Information Collected Automatically</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Usage Data:</strong> Pages visited, features used, voting activity, time spent on pages</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device type, screen resolution</li>
            <li><strong>IP Address:</strong> Used for security, fraud prevention, and approximate geographic location</li>
            <li><strong>Cookies and Tracking:</strong> See Section 6 below</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create and manage your account</li>
            <li>Administer contests, track votes, and determine winners</li>
            <li>Process payments and fulfill vote purchases</li>
            <li>Send contest updates, winner announcements, and service notifications</li>
            <li>Improve the Service and develop new features</li>
            <li>Prevent fraud, vote manipulation, and abuse</li>
            <li>Enforce our Terms of Service</li>
            <li>Respond to your inquiries and support requests</li>
            <li>Send promotional communications (with your consent, which you can withdraw at any time)</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">3. Third-Party Services</h2>
          <p>We use the following third-party services that may receive your data:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Stripe</strong> — Payment processing. Stripe&apos;s privacy policy: <a href="https://stripe.com/privacy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></li>
            <li><strong>Google OAuth</strong> — Authentication. Google&apos;s privacy policy: <a href="https://policies.google.com/privacy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></li>
            <li><strong>Facebook/Meta OAuth</strong> — Authentication. Meta&apos;s privacy policy: <a href="https://www.facebook.com/privacy/policy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">facebook.com/privacy/policy</a></li>
            <li><strong>PostHog</strong> — Product analytics. Used to understand how users interact with the Service, track feature usage, and improve user experience. PostHog&apos;s privacy policy: <a href="https://posthog.com/privacy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">posthog.com/privacy</a></li>
            <li><strong>SendGrid</strong> — Email delivery for account notifications, contest updates, and transactional emails. SendGrid&apos;s privacy policy: <a href="https://sendgrid.com/policies/privacy/" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">sendgrid.com/policies/privacy</a></li>
            <li><strong>Vercel</strong> — Hosting and infrastructure. Vercel&apos;s privacy policy: <a href="https://vercel.com/legal/privacy-policy" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></li>
            <li><strong>Neon</strong> — Database hosting. Data is stored securely in Neon&apos;s cloud PostgreSQL infrastructure.</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">4. Information Sharing &amp; Disclosure</h2>
          <p>We do <strong>not</strong> sell your personal information. We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>With Service Providers:</strong> Third-party vendors who assist in operating the Service (as listed above)</li>
            <li><strong>For Legal Reasons:</strong> When required by law, regulation, legal process, or government request</li>
            <li><strong>To Protect Rights:</strong> To enforce our Terms, protect our rights, privacy, safety, or property</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Public Content:</strong> Pet profiles, photos, and comments you post are visible to other users</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">5. Data Security</h2>
          <p>We implement industry-standard security measures including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>HTTPS/TLS encryption for all data in transit</li>
            <li>Encrypted database storage</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>Regular security audits and monitoring</li>
          </ul>
          <p>However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">6. Cookies &amp; Tracking Technologies</h2>
          <p>We use the following types of cookies:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Essential Cookies:</strong> Required for authentication, session management, and core functionality</li>
            <li><strong>Analytics Cookies:</strong> PostHog analytics to understand usage patterns and improve the Service</li>
            <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
          </ul>
          <p>You can control cookies through your browser settings. Disabling essential cookies may prevent you from using certain features of the Service.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">7. Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide you the Service. After account deletion:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account data is deleted within 30 days</li>
            <li>Anonymized voting and analytics data may be retained indefinitely</li>
            <li>Payment records are retained as required by law (typically 7 years)</li>
            <li>Content you posted (comments, photos) may be retained in anonymized form</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">8. Your Rights &amp; Choices</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access</strong> the personal information we hold about you</li>
            <li><strong>Correct</strong> inaccurate or incomplete information</li>
            <li><strong>Delete</strong> your account and associated personal data</li>
            <li><strong>Export</strong> your data in a portable format</li>
            <li><strong>Opt out</strong> of promotional emails at any time via the unsubscribe link</li>
            <li><strong>Withdraw consent</strong> for data processing where consent is the legal basis</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:privacy@votetofeed.com" className="text-brand-600 hover:underline">privacy@votetofeed.com</a>.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">9. California Privacy Rights (CCPA)</h2>
          <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Know:</strong> You may request information about what personal data we collect, use, disclose, and sell</li>
            <li><strong>Right to Delete:</strong> You may request deletion of your personal information</li>
            <li><strong>Right to Opt-Out:</strong> We do not sell personal information. If this changes, we will provide an opt-out mechanism.</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
          </ul>
          <p>To submit a CCPA request, email <a href="mailto:privacy@votetofeed.com" className="text-brand-600 hover:underline">privacy@votetofeed.com</a> with the subject line &ldquo;CCPA Request.&rdquo;</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">10. Children&apos;s Privacy (COPPA)</h2>
          <p>The Service is not directed at children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will promptly delete it. If you believe a child under 13 has provided us personal information, please contact us at <a href="mailto:privacy@votetofeed.com" className="text-brand-600 hover:underline">privacy@votetofeed.com</a>.</p>
          <p>Users between 13 and 18 may use the Service with parental consent but may not make purchases.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">11. International Users</h2>
          <p>The Service is operated from the United States. If you access the Service from outside the US, your information will be transferred to and processed in the United States. By using the Service, you consent to this transfer.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the Service and updating the &ldquo;Last updated&rdquo; date. Continued use after changes constitutes acceptance.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">13. Contact Us</h2>
          <p>For privacy-related questions or requests:</p>
          <p className="pl-4"><strong>HomeLife Brands</strong><br />Email: <a href="mailto:privacy@votetofeed.com" className="text-brand-600 hover:underline">privacy@votetofeed.com</a><br />Website: <a href="https://votetofeed.com" className="text-brand-600 hover:underline">votetofeed.com</a></p>
          <p className="pl-4 mt-2">For general inquiries:<br />Email: <a href="mailto:support@votetofeed.com" className="text-brand-600 hover:underline">support@votetofeed.com</a></p>
        </div>
      </div>
    </div>
  );
}
