import { pool } from '../config/database';


async function seedDatabase() {
  try {
    const client = await pool.connect();
    
    console.log('Seeding database with sample data...');
    
    // Create sample channels
    await client.query(`
      INSERT INTO channels (name, url, type, platform_api, metadata) VALUES
      ('Company Blog', 'https://company.com/blog', 'website', 'wordpress', '{"brandTone": "professional", "targetAudience": "tech professionals"}'),
      ('Instagram', 'https://instagram.com/company', 'instagram', 'instagram_graph', '{"brandTone": "casual", "targetAudience": "general public"}'),
      ('Facebook', 'https://facebook.com/company', 'facebook', 'facebook_graph', '{"brandTone": "friendly", "targetAudience": "business professionals"}')
      ON CONFLICT DO NOTHING
    `);
    
    // Create sample media assets
    await client.query(`
      INSERT INTO media_assets (title, description, image_url, type) VALUES
      ('Company Logo', 'Main company logo for branding', 'https://example.com/logo.png', 'icon'),
      ('Hero Image', 'Hero image for articles', 'https://example.com/hero.jpg', 'article_feature'),
      ('Instagram Post 1', 'Instagram post about new product', 'https://example.com/insta1.jpg', 'instagram_post')
      ON CONFLICT DO NOTHING
    `);
    
    // Create sample knowledge sources
    await client.query(`
      INSERT INTO knowledge_sources (name, type, source, status) VALUES
      ('Company Documentation', 'website', 'https://docs.company.com', 'processed'),
      ('Product Training Guide', 'pdf', 'https://company.com/training.pdf', 'processed'),
      ('Industry Trends 2024', 'text', 'Analysis of current industry trends and market movements...', 'processed')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('Database seeded successfully');
    client.release();
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  }
}

if (import.meta.main) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
