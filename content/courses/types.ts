export interface CourseLanding {
  tagline: string;
  audience: string[];
  outcomes: string[];
  body: { heading: string; paragraphs: string[] }[];
  testimonials: { name: string; text: string }[];
  faq: { q: string; a: string }[];
}
