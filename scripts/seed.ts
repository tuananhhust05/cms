import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash('editor123', 10);
  const editor = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      password: editorPassword,
      name: 'Editor User',
      role: 'EDITOR',
    },
  });

  // Create categories
  const techCategory = await prisma.category.upsert({
    where: { slug: 'technology' },
    update: {},
    create: {
      name: 'Technology',
      slug: 'technology',
      description: 'Posts about technology and innovation',
    },
  });

  const designCategory = await prisma.category.upsert({
    where: { slug: 'design' },
    update: {},
    create: {
      name: 'Design',
      slug: 'design',
      description: 'Posts about design and creativity',
    },
  });

  // Create tags
  const reactTag = await prisma.tag.upsert({
    where: { slug: 'react' },
    update: {},
    create: {
      name: 'React',
      slug: 'react',
    },
  });

  const nextjsTag = await prisma.tag.upsert({
    where: { slug: 'nextjs' },
    update: {},
    create: {
      name: 'Next.js',
      slug: 'nextjs',
    },
  });

  // Create sample post
  await prisma.post.upsert({
    where: { slug: 'welcome-to-cms' },
    update: {},
    create: {
      title: 'Welcome to CMS',
      slug: 'welcome-to-cms',
      content: 'This is your first blog post. You can edit or delete it from the admin panel.',
      excerpt: 'Welcome to your new content management system.',
      status: 'PUBLISHED',
      authorId: admin.id,
      categoryId: techCategory.id,
      publishedAt: new Date(),
      tags: {
        connect: [{ id: reactTag.id }, { id: nextjsTag.id }],
      },
    },
  });

  console.log('Seed data created successfully!');
  console.log('Admin credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
  console.log('Editor credentials:');
  console.log('  Email: editor@example.com');
  console.log('  Password: editor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

