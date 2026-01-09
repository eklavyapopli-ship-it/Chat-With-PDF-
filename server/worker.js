import { Worker } from 'bullmq';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const api = ""
const worker = new Worker('file-upload-queue', async job => {
  console.log(`Job: `, job.data)
  const data = JSON.parse(job.data)
const loader = new PDFLoader(data.path)
const docs = await loader.load()
const textsplitter = new RecursiveCharacterTextSplitter(
  {
    chunkSize:300,
chunkOverlap:0
  }

)

  const chunks = await textsplitter.splitDocuments(docs)
 const embedding_model = new GoogleGenerativeAIEmbeddings(
  {
    apiKey:api,
  model: "gemini-embedding-001"
}
 )
 const qdrant = new QdrantClient({
  url: "http://localhost:6333",
  // apiKey: process.env.QDRANT_API_KEY, // if using Qdrant Cloud
});
 const vector_store = await QdrantVectorStore.fromDocuments(
  chunks,
 embedding_model,{
    url:"http://localhost:6333",
    collectionName: "company_js"}
 )
 await vector_store.addDocuments(chunks)
 console.log("done")
}, { concurrency: 100 , connection:{
    host:'localhost',
    port:6379
    
}});



