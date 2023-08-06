import { AmqpRequest } from "./amq-request.js";

const delay = (time) =>
  new Promise((res) => {
    setTimeout(() => {
      res();
    }, time);
  });


async function main() {
  const request = new AmqpRequest();
  request.initialize().then(() => console.log("Connection initialized"));

  async function sendRandomRequest() {
    const a = Math.round(Math.random() * 100);
    const b = Math.round(Math.random() * 100);
    const reply = await request.send("requests_queue", { a, b });
    console.log(`${a} + ${b} = ${reply.sum}`);
  }

  for (let i = 0; i < 20; i++) {
    await sendRandomRequest();
    await delay(1000);
  }

  request.close();
}

main().catch((err) => console.error(err));
