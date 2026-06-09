import Layout from "@/components/Layout";

const About = () => (
  <Layout>
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground mb-4">About ClutchSAT</h1>
      <p className="text-muted-foreground leading-relaxed">
        ClutchSAT was built by students, for students. Our mission is to make SAT preparation accessible, engaging, and effective. We believe every student deserves high-quality test prep tools, regardless of their background. With personalized practice, smart flashcards, and adaptive study plans, we're here to help you achieve your best score.
      </p>
    </div>
  </Layout>
);

export default About;
