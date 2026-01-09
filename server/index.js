import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { Queue } from 'bullmq'
import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
const api = ""
const queue = new Queue('file-upload-queue',{
   connection:{
    host:'localhost',
    port:6379
    
}
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({storage:storage})
const app = express();
app.use(cors());
app.get('/',(req,res)=>{
    return res.json({status:"All good"})
})
app.post('/upload/pdf', upload.single('pdf'),(req,res)=>{
  queue.add('file-ready', JSON.stringify({
    filename: req.file.originalname,
    destination: req.file.destination,
    path: req.file.path
  
  }))
    return res.json({message:'uploaded'})
})
app.get(`/chat`,async (req,res)=>{
    const userQuery = req.query.message;
  const ai = new GoogleGenAI({apiKey:api});
   const embedding_model = new GoogleGenerativeAIEmbeddings(
  {
    apiKey: api,
  model: "gemini-embedding-001"
}
 )
   const vector_store = await QdrantVectorStore.fromExistingCollection(
 embedding_model,{
    url:"http://localhost:6333",
    collectionName: "company_js"}
 )

 const result = await  vector_store.similaritySearch(userQuery, 8);

   const SYSTEM_PROMPT = `
  You are helfull AI Assistant who answeres the user query based on the available context from PDF File.
  Context:
  ${JSON.stringify(result)}
  `;
const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: userQuery,
    config:{
    systemInstruction: SYSTEM_PROMPT
    }
  });
  return res.json({answer:response.text})
})

app.listen(8000,()=>console.log('server started on port 8000'))
