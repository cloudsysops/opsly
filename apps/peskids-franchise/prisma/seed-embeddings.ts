import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lazy-load OpenAI
let openai: any = null;

function getOpenAI() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require("openai").default;
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log("Generating embeddings for knowledge chunks...\n");

  // Get all chunks without embeddings
  const chunks = await prisma.knowledgeChunk.findMany({
    select: {
      id: true,
      content: true,
    },
  });

  console.log(`Found ${chunks.length} chunks to process\n`);

  let processed = 0;
  let errors = 0;

  for (const chunk of chunks) {
    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);

      // Update chunk with embedding using raw SQL (Prisma doesn't support vector type directly)
      await prisma.$executeRaw`
        UPDATE "KnowledgeChunk"
        SET embedding = ${embedding}::vector
        WHERE id = ${chunk.id}
      `;

      processed++;
      console.log(`✓ Processed chunk ${processed}/${chunks.length}: ${chunk.id.slice(0, 30)}...`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      errors++;
      console.error(`✗ Error processing chunk ${chunk.id}:`, error);
    }
  }

  console.log(`\n========================================`);
  console.log(`Embedding generation complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log(`========================================\n`);

  // Verify embeddings were created
  const withEmbeddings = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "KnowledgeChunk" WHERE embedding IS NOT NULL
  `;
  console.log(`Chunks with embeddings: ${withEmbeddings[0].count}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
