import Link from "next/link";

export const metadata = {
  title: "Terms of Service | VoteToFeed",
  description: "Terms of Service for VoteToFeed.com",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <nav className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-surface-400">
              <li><Link href="/" className="hover:text-surface-600 transition-colors">Home</Link></li>
              <li><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></li>
              <li className="text-surface-700 font-medium">Terms of Service</li>
            </ol>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 tracking-tight">Terms of Service</h1>
          <p className="mt-3 text-surface-500 text-sm">Last updated: March 9, 2026</p>
        </div>

        <div className="prose prose-surface max-w-none text-surface-700 space-y-6 text-[15px] leading-relaxed">
          <p>Welcome to VoteToFeed (&ldquo;the Service&rdquo;), operated by <strong>HomeLife Brands</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing or using VoteToFeed.com, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, please do not use the Service.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">1. Eligibility</h2>
          <p>You must be at least <strong>13 years of age</strong> to create an account and use the Service. Users under 18 must have parental or guardian consent. You must be at least <strong>18 years of age</strong> to make purchases on the Service. By using the Service, you represent that you meet these age requirements.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">2. Contests &amp; Voting — Not a Lottery</h2>
          <p><strong>VoteToFeed contests are NOT lotteries, sweepstakes, or games of chance.</strong> All contests on VoteToFeed can be won entirely using free votes. Here is how our contest system works:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Free Votes:</strong> Every registered user receives free votes on a regular basis at no cost. These free votes are fully functional and count equally toward contest standings.</li>
            <li><strong>Paid Votes:</strong> Users may optionally purchase additional votes. Purchased votes count the same as free votes. <strong>Purchasing votes does not guarantee winning any contest.</strong></li>
            <li><strong>Winner Determination:</strong> Contest winners are determined solely by total vote count accumulated during the contest period. Since free votes are available to all users, any participant can win without spending money.</li>
            <li><strong>No Purchase Necessary:</strong> No purchase is necessary to enter or win any contest on VoteToFeed.</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">3. Prizes</h2>
          <p>Prizes awarded through VoteToFeed contests are valued at their approximate market retail price at the time of the contest. Prize descriptions, values, and fulfillment details are specified on each contest page. We reserve the right to substitute prizes of equal or greater value. Winners may be required to provide shipping information and may be responsible for applicable taxes on prize winnings.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">4. Charitable Donations</h2>
          <p>A portion of proceeds from vote purchases is donated to animal shelters and rescue organizations. The specific donation rate is displayed on the platform. Donation amounts and partner organizations may change at our discretion. VoteToFeed is not a charitable organization, and vote purchases are not tax-deductible donations.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">5. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration. You must promptly update your information if it changes.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">6. User-Generated Content</h2>
          <p>By uploading pet photos, comments, or other content (&ldquo;User Content&rdquo;) to VoteToFeed, you:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Represent that you own or have the right to share such content</li>
            <li>Grant HomeLife Brands a worldwide, non-exclusive, royalty-free, sublicensable license to use, display, reproduce, modify, and distribute your User Content in connection with operating and promoting the Service</li>
            <li>Acknowledge that User Content may be visible to other users of the Service</li>
            <li>Retain ownership of your User Content, subject to the license granted above</li>
          </ul>
          <p>We reserve the right to remove any User Content that violates these Terms or that we find objectionable, without prior notice.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">7. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Create fake or duplicate accounts to manipulate voting</li>
            <li>Use bots, scripts, or automated tools to cast votes or interact with the Service (except through our official API with a valid API key)</li>
            <li>Manipulate contest outcomes through fraudulent means</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Post spam, profanity, hate speech, or inappropriate content</li>
            <li>Upload content that infringes on intellectual property rights</li>
            <li>Attempt to access other users&apos; accounts or our systems without authorization</li>
            <li>Use the Service for any illegal purpose</li>
          </ul>

          <h2 className="text-xl font-bold text-surface-900 mt-8">8. Purchases &amp; Payments</h2>
          <p>All payments are processed securely through Stripe. By making a purchase, you agree to Stripe&apos;s terms of service. All purchases of vote packages are final and non-refundable, except as required by applicable law or at our sole discretion. Prices are in US dollars and may change without notice.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">9. Account Termination</h2>
          <p>We may suspend or terminate your account at any time, with or without cause, and with or without notice. Reasons for termination include, but are not limited to: violation of these Terms, fraudulent activity, vote manipulation, or abusive behavior. Upon termination, your right to use the Service ceases immediately. Any unused paid votes may be forfeited upon termination for cause.</p>
          <p>You may delete your account at any time by contacting us at <a href="mailto:support@votetofeed.com" className="text-brand-600 hover:underline">support@votetofeed.com</a>.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">10. Limitation of Liability</h2>
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOMELIFE BRANDS AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
          <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">11. Indemnification</h2>
          <p>You agree to indemnify and hold harmless HomeLife Brands and its affiliates from any claims, damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your use of the Service, your User Content, or your violation of these Terms.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">12. Dispute Resolution</h2>
          <p>Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the American Arbitration Association&apos;s rules, conducted in the State of California. You waive any right to participate in a class action lawsuit or class-wide arbitration. For claims under $10,000, arbitration may be conducted online or by phone.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">13. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">14. Changes to Terms</h2>
          <p>We may update these Terms at any time. We will notify users of material changes via email or a notice on the Service. Continued use after changes constitutes acceptance of the updated Terms.</p>

          <h2 className="text-xl font-bold text-surface-900 mt-8">15. Contact</h2>
          <p>For questions about these Terms, contact us at:</p>
          <p className="pl-4"><strong>HomeLife Brands</strong><br />Email: <a href="mailto:legal@votetofeed.com" className="text-brand-600 hover:underline">legal@votetofeed.com</a><br />Website: <a href="https://votetofeed.com" className="text-brand-600 hover:underline">votetofeed.com</a></p>
        </div>
      </div>
    </div>
  );
}
