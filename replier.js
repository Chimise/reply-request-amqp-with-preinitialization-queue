import {AmqpReply} from "./amq-reply.js";

async function main() {
  const reply = new AmqpReply("requests_queue");
  
  reply.onMessage((req) => {
    console.log("Request received", req);
    return { sum: req.a + req.b };
  });
}

main().catch((err) => console.error(err));
