import { postgresCheckpointer } from "../features/agent/lib/memory";
import dotenv from "dotenv";
import path from "path";

// Load local environment
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  const sessionId = "f3851aba-df2a-4c3d-861d-0b7a91d4a495";
  console.log("Loading history for thread:", sessionId);
  
  // Get checkpoint using checkpointer
  const config = { configurable: { thread_id: sessionId } };
  const checkpoint = await postgresCheckpointer.get(config);
  
  if (!checkpoint) {
    console.log("No checkpoint found using checkpointer.");
    return;
  }
  
  console.log("Checkpoint structure keys:", Object.keys(checkpoint));
  
  const channelValues: any = checkpoint.channel_values || {};
  console.log("Channel values keys:", Object.keys(channelValues));
  
  const messages = channelValues.messages || [];
  console.log(`Total messages in checkpoint channel_values.messages: ${messages.length}`);
  
  messages.forEach((msg: any, idx: number) => {
    console.log(`\n--- Message ${idx} ---`);
    console.log(`ID: ${msg.id}`);
    console.log(`Type: ${msg.constructor?.name || 'Unknown'} / ${typeof msg._getType === 'function' ? msg._getType() : 'n/a'}`);
    console.log(`Role: ${msg.role}`);
    console.log(`Content: ${typeof msg.content === 'string' ? msg.content.substring(0, 150) : JSON.stringify(msg.content).substring(0, 150)}...`);
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log(`Tool Calls:`, JSON.stringify(msg.tool_calls));
    }
    if (msg.tool_call_id) {
      console.log(`Tool Call ID:`, msg.tool_call_id);
    }
  });
}

run().catch(console.error);
