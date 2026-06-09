// Complete SAT question hierarchy: Subject > Subsection > Sub-subsection

export const SAT_HIERARCHY: Record<string, Record<string, string[]>> = {
  Math: {
    Algebra: [
      "Linear equations in one variable",
      "Linear functions",
      "Linear equations in two variables",
      "Systems of two linear equations in two variables",
      "Linear inequalities in one or two variables",
    ],
    "Advanced Math": [
      "Equivalent expressions",
      "Nonlinear equations in one variable and systems of equations in two variables",
      "Nonlinear functions",
    ],
    "Problem Solving & Data Analysis": [
      "Ratios, rates, proportional relationships, and units",
      "One-variable data: Distributions and measures of center and spread",
      "Two-variable data: Models and scatterplots",
      "Probability and conditional probability",
      "Inference from sample statistics and margin of error",
      "Evaluating statistical claims: Observational studies and experiments",
    ],
    "Geometry and Trigonometry": [
      "Area and volume",
      "Lines, angles, and triangles",
      "Right triangles and trigonometry",
      "Circles",
    ],
  },
  English: {
    "Craft and Structure": [
      "Cross-Text Connections",
      "Text Structure and Purpose",
      "Words in Context",
    ],
    "Expression of Ideas": [
      "Rhetorical Synthesis",
      "Transitions",
    ],
    "Information and Ideas": [
      "Central Ideas and Details",
      "Command of Evidence",
      "Inferences",
    ],
    "Standard English Conventions": [
      "Boundaries",
      "Form, Structure, and Sense",
    ],
  },
};

export const MATH_SUBSECTIONS = Object.keys(SAT_HIERARCHY.Math);
export const ENGLISH_SUBSECTIONS = Object.keys(SAT_HIERARCHY.English);
export const ALL_SUBSECTIONS = [...MATH_SUBSECTIONS, ...ENGLISH_SUBSECTIONS];

export const getSubSubsections = (subsection: string): string[] => {
  for (const subject of Object.values(SAT_HIERARCHY)) {
    if (subject[subsection]) return subject[subsection];
  }
  return [];
};

export const isEnglish = (subject: string) =>
  subject === "English" || subject === "Reading" || subject === "Writing";
