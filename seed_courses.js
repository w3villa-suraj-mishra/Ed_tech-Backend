const { sequelize, User, Category, Course, Section, SubSection } = require('./models');

const sampleThumbnails = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60"
];

const courseTitles = [
  "Full Stack Web Development Bootcamp 2026",
  "Data Structures & Algorithms [Supreme 4.0]",
  "React & Next.js Masterclass with TypeScript",
  "Python for Data Science and Machine Learning",
  "Node.js, Express & PostgreSQL Backend Architecture",
  "Cloud Engineering with AWS & Docker Containers",
  "Complete System Design for Tech Interviews",
  "Modern UI/UX Design with Figma & Tailwind CSS",
  "DevOps Essentials: CI/CD Pipelines & Kubernetes",
  "Cyber Security & Ethical Hacking Masterclass",
  "Flutter & Dart Cross-Platform Mobile App Development",
  "AI & Large Language Models Prompt Engineering",
  "GraphQL, Prisma & Microservices Development",
  "Rust Programming Language Complete Guide",
  "Go Language Backend API Engineering",
  "iOS Development with Swift 6 and SwiftUI",
  "Vue.js 3 & Nuxt Fullstack Mastery",
  "Data Analytics with SQL, Tableau and PowerBI",
  "Blockchain & Ethereum Smart Contract Engineering",
  "Complete React Native Mobile Development"
];

async function seed() {
  try {
    console.log("Seeding 20 dynamic courses...");

    // Get an instructor
    let instructor = await User.findOne({ where: { accountType: 'Instructor' } });
    if (!instructor) {
      instructor = await User.findOne();
    }
    const instructorId = instructor ? instructor.id : 1;

    // Get categories
    let categories = await Category.findAll();
    if (!categories || categories.length === 0) {
      categories = [
        await Category.create({ name: 'Web Development', description: 'Build web applications' }),
        await Category.create({ name: 'Computer Science', description: 'Algorithms and systems' })
      ];
    }

    for (let i = 0; i < 20; i++) {
      const title = courseTitles[i];
      const category = categories[i % categories.length];
      const thumb = sampleThumbnails[i % sampleThumbnails.length];
      const price = 2499 + (i * 350) % 5500;

      const course = await Course.create({
        courseName: title,
        courseDescription: `Become an expert in ${title}. Learn hands-on projects, industry best practices, real-world case studies, and interview preparation.`,
        whatYouWillLearn: `Master fundamental concepts of ${title}, build 5 production-grade projects, optimize application performance, deploy to cloud.`,
        price: price,
        status: 'Published',
        categoryId: category.id,
        instructorId: instructorId,
        thumbnail: thumb,
        tag: JSON.stringify(['Development', 'Featured', 'Tech']),
        instructions: JSON.stringify(['Prerequisite knowledge of basic computer skills', 'Dedicated practice of 1 hour daily']),
        totalDuration: `${(15 + (i * 3.5)).toFixed(1)} Hours`
      });

      // Create 2 sections per course
      for (let s = 1; s <= 2; s++) {
        const section = await Section.create({
          sectionName: `Section ${s}: Core Fundamentals & Architecture`,
          courseId: course.id
        });

        await SubSection.create({
          title: `Lecture ${s}.1: Introduction to ${title}`,
          timeDuration: '12:45',
          description: 'High-level overview and setup instructions',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          sectionId: section.id
        });
      }

      console.log(`[${i+1}/20] Created Course: ${title}`);
    }

    console.log("Successfully seeded 20 dynamic courses!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
