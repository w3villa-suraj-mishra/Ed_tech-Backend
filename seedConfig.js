const { Sequelize, DataTypes } = require('sequelize');
const config = require('./config/config.js')['development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
});

const SiteConfig = sequelize.define('SiteConfig', {
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'SiteConfigs',
});

const contactDetailsData = [
  {
    icon: "FiMessageSquare",
    title: "Chat with us",
    desc: "Our friendly team is here to help.",
    value: "support@codelearn.com",
    isLink: true,
    href: "mailto:support@codelearn.com",
  },
  {
    icon: "FiMapPin",
    title: "Visit our office",
    desc: "Come say hi at our office HQ.",
    value: "Sector 63, Block A, Noida, Uttar Pradesh 201301",
    isLink: false,
  },
  {
    icon: "FiPhone",
    title: "Call us",
    desc: "Mon - Fri from 9am to 6pm",
    value: "+91 12345 67890",
    isLink: true,
    href: "tel:+911234567890",
  },
  {
    icon: "FiClock",
    title: "Response Time",
    desc: "We usually reply within",
    value: "24 hours",
    isLink: false,
  },
];

const faqsData = [
  {
    id: "general",
    title: "General Questions",
    desc: "Everything you need to know about the platform.",
    icon: "FiHelpCircle",
    questions: [
      { q: "What is CodeLearn?", a: "CodeLearn is a comprehensive online learning platform designed to teach coding and software engineering." },
      { q: "Do I need prior experience?", a: "No prior experience is necessary. We have courses tailored for complete beginners." }
    ]
  },
  {
    id: "billing",
    title: "Billing & Subscriptions",
    desc: "Questions about payments, refunds, and plans.",
    icon: "FiBriefcase",
    questions: [
      { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and regional payment gateways." },
      { q: "Can I get a refund?", a: "Yes, we offer a 14-day money-back guarantee if you are not satisfied." }
    ]
  }
];

const homeFaqData = [
  {
    question: "Are the courses suitable for complete beginners?",
    answer: "Yes, absolutely. Every foundational learning track starts from ground zero with crystal-clear explanations, interactive sandbox exercises, and step-by-step guidance. No prior coding experience is required."
  },
  {
    question: "Will I receive a verified certificate upon completion?",
    answer: "Yes. Every student who successfully completes a course and its associated capstone practice tests receives a cryptographically verifiable certificate with a unique public URL that you can share on LinkedIn and your resume."
  },
  {
    question: "How does the interactive coding environment work?",
    answer: "Our cloud sandbox runs directly inside your modern browser. You don't need to install node, compilers, or local packages. You write code, run automated tests, and receive immediate console diagnostics in seconds."
  },
  {
    question: "Can I access course content on mobile and tablet devices?",
    answer: "Yes! The entire CodeLearn platform is fully responsive and optimized for smartphones and tablets, allowing you to watch lectures, review documentation, and take quizzes wherever you are."
  },
  {
    question: "What is your refund and satisfaction policy?",
    answer: "We offer a hassle-free 14-day satisfaction guarantee on all course enrollments. If a course does not meet your expectations, you can request a full refund directly from your account settings."
  }
];

const homeCategoryDesignPresets = [
  {
    name: "Web Development",
    type: "code",
    description: "Learn full-stack web development with modern tools and frameworks.",
    courseCount: "2+",
    gradient: "from-[#93C5FD] via-[#60A5FA] to-[#3B82F6]",
    glowShadow: "shadow-[0_8px_20px_rgba(59,130,246,0.3)]",
    pillBg: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]"
  },
  {
    name: "Data Science",
    type: "chart",
    description: "Master data analysis, machine learning, and visualization.",
    courseCount: "2+",
    gradient: "from-[#E9D5FF] via-[#C084FC] to-[#A855F7]",
    glowShadow: "shadow-[0_8px_20px_rgba(168,85,247,0.3)]",
    pillBg: "bg-[#FAF5FF] text-[#9333EA] border-[#F3E8FF]"
  },
  {
    name: "Mobile Development",
    type: "mobile",
    description: "Build stunning iOS and Android apps for real-world use.",
    courseCount: "1+",
    gradient: "from-[#A7F3D0] via-[#34D399] to-[#10B981]",
    glowShadow: "shadow-[0_8px_20px_rgba(16,185,129,0.3)]",
    pillBg: "bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]"
  },
  {
    name: "UI/UX Design",
    type: "pen",
    description: "Create beautiful and user-friendly interfaces that make an impact.",
    courseCount: "1+",
    gradient: "from-[#FED7AA] via-[#FB923C] to-[#F97316]",
    glowShadow: "shadow-[0_8px_20px_rgba(249,115,22,0.3)]",
    pillBg: "bg-[#FFF7ED] text-[#EA580C] border-[#FFEDD5]"
  },
  {
    name: "Data Structures & Algorithms",
    type: "database",
    description: "Learn problem solving and coding interview concepts.",
    courseCount: "1+",
    gradient: "from-[#FECDD3] via-[#FB7185] to-[#F43F5E]",
    glowShadow: "shadow-[0_8px_20px_rgba(244,63,94,0.3)]",
    pillBg: "bg-[#FFF1F2] text-[#E11D48] border-[#FFE4E6]"
  },
  {
    name: "Machine Learning",
    type: "brain",
    description: "Build models and intelligent systems using real data.",
    courseCount: "1+",
    gradient: "from-[#DDD6FE] via-[#A78BFA] to-[#7C3AED]",
    glowShadow: "shadow-[0_8px_20px_rgba(124,58,237,0.3)]",
    pillBg: "bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]"
  }
];

const homeDefaultFeaturedCourses = [
  {
    id: "feat-1",
    courseName: "Complete React Native Mobile Development",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    badge: "BESTSELLER",
    badgeColor: "bg-[#6366F1]",
    instructor: "Senior Instructor",
    rating: "4.8",
    reviewsCount: "1.2K",
    price: "3649"
  },
  {
    id: "feat-2",
    courseName: "Blockchain & Ethereum Smart Contract Engineering",
    thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80",
    badge: "MOST POPULAR",
    badgeColor: "bg-[#6366F1]",
    instructor: "Senior Instructor",
    rating: "4.9",
    reviewsCount: "1.6K",
    price: "3299"
  },
  {
    id: "feat-3",
    courseName: "Data Analytics with SQL, Tableau and PowerBI",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    badge: "TRENDING",
    badgeColor: "bg-[#4F46E5]",
    instructor: "Senior Instructor",
    rating: "4.8",
    reviewsCount: "2.0K",
    price: "2949"
  },
  {
    id: "feat-4",
    courseName: "Vue.js 3 & Nuxt Fullstack Mastery",
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
    badge: "TOP RATED",
    badgeColor: "bg-[#7C3AED]",
    instructor: "Senior Instructor",
    rating: "4.9",
    reviewsCount: "2.4K",
    price: "2599"
  }
];


async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connection established.');

    const upsertConfig = async (key, value) => {
      const existing = await SiteConfig.findOne({ where: { key } });
      if (existing) {
        await existing.update({ value: JSON.stringify(value) });
      } else {
        await SiteConfig.create({ key, value: JSON.stringify(value) });
      }
    };

    await upsertConfig('contactDetails', contactDetailsData);
    await upsertConfig('faqs', faqsData);
    await upsertConfig('homeFaqs', homeFaqData);
    await upsertConfig('homeCategoryDesignPresets', homeCategoryDesignPresets);
    await upsertConfig('homeDefaultFeaturedCourses', homeDefaultFeaturedCourses);
    
    console.log('Data seeded successfully.');
  } catch (error) {
    console.error('Unable to seed data:', error);
  } finally {
    await sequelize.close();
  }
}

seed();
