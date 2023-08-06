import amqp from "amqplib";

export class AmqpReply {
    constructor(replyQueue) {
      this.replyQueue = replyQueue;
    }
  
    async initialize() {
      this.connection = await amqp.connect("amqp://localhost");
      this.channel = await this.connection.createChannel();
      this.queue = (await this.channel.assertQueue(this.replyQueue)).queue;
    }
  
    onMessage(handler) {
      if (!this.channel) {
        return this.initialize().then(() => {
          this.onMessage(handler);
        });
      }
      console.log('Listening to connection on queue: %s', this.queue);
  
      this.channel.consume(this.queue, async (msg) => {
        const message = JSON.parse(msg.content.toString());
        const result = await handler(message);
  
        this.channel.sendToQueue(
          msg.properties.replyTo,
          Buffer.from(JSON.stringify(result)),
          {
            correlationId: msg.properties.correlationId,
          }
        );
  
        this.channel.ack(msg);
      });
    }
  }