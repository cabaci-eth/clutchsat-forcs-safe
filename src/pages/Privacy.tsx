import Layout from "@/components/Layout";

const Privacy = () => (
  <Layout>
    <div className="container mx-auto max-w-2xl px-4 py-20">
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>Last updated: February 28, 2026</p>
        <p>ClutchSAT respects your privacy. This policy describes how we collect, use, and protect your personal information when you use our platform.</p>
        <h2 className="font-display text-lg font-semibold text-foreground mt-6">Information We Collect</h2>
        <p>We collect information you provide directly, such as your email address when creating an account, and usage data like quiz scores and practice history to improve your experience.</p>
        <h2 className="font-display text-lg font-semibold text-foreground mt-6">How We Use Your Information</h2>
        <p>We use your data to personalize your study experience, track your progress, and improve our platform. We never sell your personal information to third parties.</p>
        <h2 className="font-display text-lg font-semibold text-foreground mt-6">Contact</h2>
        <p>If you have any questions about this policy, please contact us through our Contact page.</p>
      </div>
    </div>
  </Layout>
);

export default Privacy;
