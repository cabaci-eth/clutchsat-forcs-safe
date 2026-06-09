import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

const Contact = () => (
  <Layout>
    <div className="container mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-3xl font-bold text-foreground mb-4 text-center">Contact Us</h1>
      <p className="text-center text-muted-foreground mb-8">Have questions or feedback? We'd love to hear from you at ClutchSAT.</p>
      <form className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="text-sm font-medium text-foreground">Name</label>
          <input className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground" placeholder="Your name" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Email</label>
          <input type="email" className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground" placeholder="you@example.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Message</label>
          <textarea rows={4} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground resize-none" placeholder="Your message..." />
        </div>
        <Button className="w-full gradient-primary text-primary-foreground">Send Message</Button>
      </form>
    </div>
  </Layout>
);

export default Contact;
